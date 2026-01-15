import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Usuario } from '../entities/Usuario';
import { Rol } from '../entities/Rol';
import { Docente } from '../entities/Docente';

export const usuariosRouter = Router();

usuariosRouter.use(requiereAuth, requiereRol('administrador'));

usuariosRouter.get('/', async (_req, res) => {
  const userRepo = AppDataSource.getRepository(Usuario);
  const docenteRepo = AppDataSource.getRepository(Docente);

  const docentes = await docenteRepo.find({ relations: ['usuario'] });
  const docenteByUser = new Map<number, Docente>();
  const docenteByCedula = new Map<string, Docente>();
  for (const d of docentes) {
    if (d.usuario?.id) docenteByUser.set(d.usuario.id, d);
    if (d.cedula) docenteByCedula.set(d.cedula, d);
  }

  const data = await userRepo.find({ relations: ['rol'] });
  const updates: Usuario[] = [];
  const docentesToLink: Docente[] = [];

  for (const u of data) {
    let d = docenteByUser.get(u.id);
    if (!d && docenteByCedula.has(u.username)) {
      d = docenteByCedula.get(u.username) as Docente;
      if (d && !d.usuario) {
        d.usuario = u;
        docentesToLink.push(d);
      }
    }
    if (!d) continue;

    const nombreFallback = `${d.apellidos || ''} ${d.nombres || ''}`.trim();
    const correoFallback = d.correo_electronico || (d.cedula ? `${d.cedula}@example.com` : '');

    let changed = false;
    if ((!u.nombre || u.nombre.toLowerCase() === 'null null' || u.nombre.trim() === '') && nombreFallback) {
      u.nombre = nombreFallback;
      changed = true;
    }
    if ((!u.correo || u.correo.trim() === '' || u.correo.includes('@example.com')) && correoFallback) {
      u.correo = correoFallback;
      changed = true;
    }
    if (changed) updates.push(u);
  }

  if (docentesToLink.length) {
    await docenteRepo.save(docentesToLink);
  }
  if (updates.length) {
    await userRepo.save(updates);
  }

  res.json(data);
});

usuariosRouter.post('/', async (req, res) => {
  const repo = AppDataSource.getRepository(Usuario);
  const rolRepo = AppDataSource.getRepository(Rol);
  const { nombre, correo, username, password, rol_id, estado } = req.body;
  const rol = await rolRepo.findOneBy({ id: rol_id });
  if (!rol) return res.status(400).json({ message: 'Rol inválido' });
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const usuario = repo.create({ nombre, correo, username, password_hash, rol, estado });
    const saved = await repo.save(usuario);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo crear', error: err.message });
  }
});

usuariosRouter.put('/:id', async (req, res) => {
  const repo = AppDataSource.getRepository(Usuario);
  const usuario = await repo.findOne({ where: { id: Number(req.params.id) }, relations: ['rol'] });
  if (!usuario) return res.status(404).json({ message: 'No encontrado' });
  const { nombre, correo, username, password, rol_id, estado } = req.body;
  if (rol_id) {
    const rol = await AppDataSource.getRepository(Rol).findOneBy({ id: rol_id });
    if (!rol) return res.status(400).json({ message: 'Rol inválido' });
    (usuario as any).rol = rol;
  }
  if (password) usuario.password_hash = await bcrypt.hash(password, 10);
  if (nombre) usuario.nombre = nombre;
  if (correo) usuario.correo = correo;
  if (username) usuario.username = username;
  if (estado) usuario.estado = estado;
  try {
    const saved = await repo.save(usuario);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo actualizar', error: err.message });
  }
});

usuariosRouter.delete('/:id', async (req, res) => {
  const repo = AppDataSource.getRepository(Usuario);
  const usuario = await repo.findOneBy({ id: Number(req.params.id) });
  if (!usuario) return res.status(404).json({ message: 'No encontrado' });
  usuario.estado = 'inactivo';
  await repo.save(usuario);
  res.json({ message: 'Marcado como inactivo' });
});
