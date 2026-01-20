import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Usuario } from '../entities/Usuario';
import { Rol } from '../entities/Rol';

export const usuariosRouter = Router();

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const isPasswordStrong = (pwd: string) => PASSWORD_REGEX.test(pwd);

usuariosRouter.use(requiereAuth, requiereRol('administrador'));

usuariosRouter.get('/', async (req, res) => {
  const userRepo = AppDataSource.getRepository(Usuario);
  // Filtros y paginación
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const search = (req.query.search as string) || '';
  const rolFilter = (req.query.rol as string) || ''; // puede ser id o nombre

  const qb = userRepo.createQueryBuilder('u')
    .leftJoinAndSelect('u.rol', 'r')
    .orderBy('u.id', 'DESC');

  if (search) {
    qb.andWhere('(u.nombre LIKE :s OR u.username LIKE :s OR u.correo LIKE :s)', { s: `%${search}%` });
  }

  if (rolFilter) {
    const roles: number[] = [];
    const parts = rolFilter.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    for (const p of parts) {
      if (p === 'administrador') roles.push(1);
      else if (p === 'secretario') roles.push(2);
      else if (!Number.isNaN(Number(p))) roles.push(Number(p));
    }
    if (roles.length) {
      qb.andWhere('r.id IN (:...roles)', { roles });
    }
  }

  const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

usuariosRouter.post('/', async (req, res) => {
  const repo = AppDataSource.getRepository(Usuario);
  const rolRepo = AppDataSource.getRepository(Rol);
  const { nombre, correo, username, password, rol_id, estado } = req.body;
  const rol = await rolRepo.findOneBy({ id: rol_id });
  if (!rol) return res.status(400).json({ message: 'Rol inválido' });
  if (!password || !isPasswordStrong(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, con letras y números' });
  }
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
  if (password) {
    if (!isPasswordStrong(password)) return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, con letras y números' });
    usuario.password_hash = await bcrypt.hash(password, 10);
  }
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
