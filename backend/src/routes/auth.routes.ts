import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/data-source';
import { Usuario } from '../entities/Usuario';
import { Rol } from '../entities/Rol';
import { Docente } from '../entities/Docente';
import { env } from '../config/env';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const repo = AppDataSource.getRepository(Usuario);
  let usuario = await repo.findOne({ where: [{ username }, { correo: username }], relations: ['rol'] });

  // Si intenta admin y no existe, autocrea con password por defecto
  if (!usuario && username === 'admin') {
    const rolRepo = AppDataSource.getRepository(Rol);
    const rolAdmin = await rolRepo.findOne({ where: { nombre: 'administrador' } });
    if (rolAdmin) {
      const password_hash = await bcrypt.hash('Admin123!', 10);
      const nuevoAdmin = repo.create({
        nombre: 'Administrador',
        correo: 'admin@asoinca.com',
        username: 'admin',
        password_hash,
        rol: rolAdmin,
        estado: 'activo'
      });
      usuario = await repo.save(nuevoAdmin);
    }
  }

  // Si no existe usuario, intentar auto-crear para docente por cédula
  if (!usuario) {
    const docenteRepo = AppDataSource.getRepository(Docente);
    const rolRepo = AppDataSource.getRepository(Rol);
    const docente = await docenteRepo.findOne({ where: { cedula: username }, relations: ['usuario'] });
    if (docente) {
      const rolDocente = await rolRepo.findOne({ where: { nombre: 'docente' } });
      if (!rolDocente) return res.status(401).json({ message: 'Rol docente no configurado' });
      const password_hash = await bcrypt.hash(docente.cedula, 10);
      const nuevoUsuario = repo.create({
        nombre: `${docente.nombres} ${docente.apellidos}`.trim(),
        correo: docente.correo_electronico || `${docente.cedula}@example.com`,
        username: docente.cedula,
        password_hash,
        rol: rolDocente,
        estado: 'activo'
      });
      usuario = await repo.save(nuevoUsuario);
      docente.usuario = usuario;
      await docenteRepo.save(docente);
    }
  }

  if (!usuario) return res.status(401).json({ message: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });
  const payload = { sub: usuario.id, rol: usuario.rol.nombre };
  const accessSecret: Secret = env.jwt.secret as Secret;
  const refreshSecret: Secret = env.jwt.refreshSecret as Secret;
  const accessExpires: SignOptions['expiresIn'] = env.jwt.expires as SignOptions['expiresIn'];
  const refreshExpires: SignOptions['expiresIn'] = env.jwt.refreshExpires as SignOptions['expiresIn'];
  const token = jwt.sign(payload, accessSecret, { expiresIn: accessExpires });
  const refresh = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpires });
  res.json({ token, refresh, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol.nombre } });
});

// Endpoint placeholder para refresh
authRouter.post('/refresh', (req, res) => {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ message: 'Refresh token requerido' });
  try {
    const payload = jwt.verify(refresh, env.jwt.refreshSecret as Secret) as any;
    const accessExpires: SignOptions['expiresIn'] = env.jwt.expires as SignOptions['expiresIn'];
    const token = jwt.sign({ sub: payload.sub, rol: payload.rol }, env.jwt.secret as Secret, { expiresIn: accessExpires });
    res.json({ token });
  } catch (err) {
    res.status(401).json({ message: 'Refresh inválido' });
  }
});
