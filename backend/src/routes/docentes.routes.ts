import { Router, Request, Response } from 'express';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Docente } from '../entities/Docente';
import { Municipio } from '../entities/Municipio';
import { DeepPartial } from 'typeorm';
import { Departamento } from '../entities/Departamento';
import { Estatuto } from '../entities/Estatuto';
import { Usuario } from '../entities/Usuario';
import bcrypt from 'bcryptjs';

const VINCULACIONES = ['docente', 'directivo_docente', 'administrativo', 'pensionado'] as const;
const TIPOS_VINCULACION = [
  'propiedad',
  'provisional_definitivo',
  'provisional_temporal',
  'oferente',
  'rector_propiedad',
  'rector_encargo',
  'coordinador_propiedad',
  'coordinador_encargo',
  'director_rural_propiedad',
  'director_rural_encargo',
  'administrativo_propiedad',
  'administrativo_provisional',
  'pensionado_activo',
  'pensionado_retirado'
] as const;

const requiereEstatuto = (vinculacion: string) => vinculacion !== 'administrativo';

export const docentesRouter = Router();

// Acceso para docentes a su propia ficha
docentesRouter.get('/me', requiereAuth, requiereRol('docente', 'administrador'), async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const repo = AppDataSource.getRepository(Docente);
  const docente = await repo.findOne({ where: { usuario: { id: userId } }, relations: ['usuario', 'municipio_residencia', 'municipio_residencia.departamento_rel', 'municipio_donde_labora', 'municipio_donde_labora.departamento_rel', 'estatuto'] });
  if (!docente) return res.status(404).json({ message: 'Docente no encontrado' });
  res.setHeader('Cache-Control', 'no-store');
  res.json(docente);
});

docentesRouter.put('/me', requiereAuth, requiereRol('docente', 'administrador'), async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const repo = AppDataSource.getRepository(Docente);
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const municipioRepo = AppDataSource.getRepository(Municipio);
  const estatutoRepo = AppDataSource.getRepository(Estatuto);
  const docente = await repo.findOne({ where: { usuario: { id: userId } }, relations: ['usuario', 'municipio_residencia', 'municipio_residencia.departamento_rel', 'municipio_donde_labora', 'municipio_donde_labora.departamento_rel', 'estatuto'] });
  if (!docente) return res.status(404).json({ message: 'Docente no encontrado' });

  const required = [
    'nombres', 'apellidos', 'numero_celular', 'correo_electronico', 'fecha_nacimiento',
    'departamento_residencia', 'direccion_residencia', 'municipio_residencia_id', 'municipio_donde_labora_id',
    'institucion_educativa_donde_labora', 'vinculacion', 'tipo_vinculacion'
  ];
  const missing = required.filter((f) => req.body[f] === undefined || req.body[f] === null || `${req.body[f]}`.trim() === '');
  if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
  if (!VINCULACIONES.includes(req.body.vinculacion)) return res.status(400).json({ message: 'Vinculación inválida' });
  if (!TIPOS_VINCULACION.includes(req.body.tipo_vinculacion)) return res.status(400).json({ message: 'Tipo de vinculación inválido' });
  if (requiereEstatuto(req.body.vinculacion) && !req.body.estatuto_id) return res.status(400).json({ message: 'Estatuto requerido' });

  const allowed: DeepPartial<Docente> = {
    nombres: req.body.nombres,
    apellidos: req.body.apellidos,
    numero_celular: req.body.numero_celular,
    correo_electronico: req.body.correo_electronico,
    fecha_nacimiento: req.body.fecha_nacimiento,
    departamento_residencia: req.body.departamento_residencia,
    direccion_residencia: req.body.direccion_residencia,
    institucion_educativa_donde_labora: req.body.institucion_educativa_donde_labora,
    vinculacion: req.body.vinculacion,
    tipo_vinculacion: req.body.tipo_vinculacion
  };
  if (req.body.vinculacion && !VINCULACIONES.includes(req.body.vinculacion)) {
    return res.status(400).json({ message: 'Vinculación inválida' });
  }
  if (req.body.tipo_vinculacion && !TIPOS_VINCULACION.includes(req.body.tipo_vinculacion)) {
    return res.status(400).json({ message: 'Tipo de vinculación inválido' });
  }
  if (req.body.municipio_residencia_id) {
    docente.municipio_residencia = (await municipioRepo.findOneBy({ id: req.body.municipio_residencia_id })) || null;
  }
  if (req.body.municipio_donde_labora_id) {
    docente.municipio_donde_labora = (await municipioRepo.findOneBy({ id: req.body.municipio_donde_labora_id })) || null;
  }
  if (req.body.estatuto_id) {
    docente.estatuto = (await estatutoRepo.findOneBy({ id: req.body.estatuto_id })) || null;
  }
  repo.merge(docente, allowed);
  try {
    const saved = await repo.save(docente);

    if (docente.usuario) {
      const nuevoNombre = `${docente.apellidos || ''} ${docente.nombres || ''}`.trim();
      const nuevoCorreo = docente.correo_electronico || docente.usuario.correo;
      docente.usuario.nombre = nuevoNombre || docente.usuario.nombre;
      docente.usuario.correo = nuevoCorreo || docente.usuario.correo;
      await usuarioRepo.save(docente.usuario);
    }

    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo actualizar', error: err.message });
  }
});

// Actualizar credenciales (docente/admin)
docentesRouter.put('/me/credentials', requiereAuth, requiereRol('docente', 'administrador'), async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { username, current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas' });
  if (new_password.length < 6) return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });

  const userRepo = AppDataSource.getRepository(Usuario);
  const usuario = await userRepo.findOne({ where: { id: userId } });
  if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

  const ok = await bcrypt.compare(current_password, usuario.password_hash);
  if (!ok) return res.status(400).json({ message: 'Contraseña actual incorrecta' });

  if (username && username !== usuario.username) {
    const exists = await userRepo.findOne({ where: { username } });
    if (exists) return res.status(400).json({ message: 'El usuario ya está en uso' });
    usuario.username = username;
  }

  usuario.password_hash = await bcrypt.hash(new_password, 10);
  await userRepo.save(usuario);
  res.json({ message: 'Credenciales actualizadas' });
});

// Rutas admin
// Catálogos para selects (docentes y admin)
docentesRouter.get('/catalogos', requiereAuth, requiereRol('docente', 'administrador'), async (_req: Request, res: Response) => {
  const estatutoRepo = AppDataSource.getRepository(Estatuto);
  const [estatutos, estadosLaborales] = await Promise.all([
    estatutoRepo.find({ order: { nombre: 'ASC' } }),
    Promise.resolve([])
  ]);
  res.json({ estatutos, estadosLaborales: [], vinculaciones: VINCULACIONES, tiposVinculacion: TIPOS_VINCULACION });
});

// Rutas admin
docentesRouter.use(requiereAuth, requiereRol('administrador'));

docentesRouter.get('/', async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const cedulaExacta = (req.query.cedula as string) || '';
  const municipioId = req.query.municipio ? Number(req.query.municipio) : undefined;

  const repo = AppDataSource.getRepository(Docente);
  const qb = repo.createQueryBuilder('d')
    .leftJoinAndSelect('d.municipio_residencia', 'mr')
    .leftJoinAndSelect('mr.departamento_rel', 'mr_dep')
    .leftJoinAndSelect('d.municipio_donde_labora', 'ml')
    .leftJoinAndSelect('ml.departamento_rel', 'ml_dep')
    .leftJoinAndSelect('d.estatuto', 'es')
    .where('1=1')
    .orderBy('d.created_at', 'DESC');
  if (cedulaExacta) {
    qb.andWhere('d.cedula = :c', { c: cedulaExacta });
  } else if (search) {
    qb.andWhere('(d.cedula LIKE :s OR d.nombres LIKE :s OR d.apellidos LIKE :s)', { s: `%${search}%` });
  }
  if (municipioId) {
    qb.andWhere('d.municipio_residencia_id = :mun OR d.municipio_donde_labora_id = :mun', { mun: municipioId });
  }
  const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

docentesRouter.post('/', async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Docente);
  const municipioRepo = AppDataSource.getRepository(Municipio);
  const estatutoRepo = AppDataSource.getRepository(Estatuto);
  const body = req.body;
  if (Array.isArray(body)) return res.status(400).json({ message: 'Solo se acepta un docente' });

  const required = [
    'cedula', 'nombres', 'apellidos', 'numero_celular', 'correo_electronico', 'fecha_nacimiento',
    'departamento_residencia', 'direccion_residencia', 'municipio_residencia_id', 'municipio_donde_labora_id',
    'institucion_educativa_donde_labora', 'vinculacion', 'tipo_vinculacion'
  ];
  const missing = required.filter((f) => body[f] === undefined || body[f] === null || `${body[f]}`.trim() === '');
  if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
  if (!VINCULACIONES.includes(body.vinculacion)) return res.status(400).json({ message: 'Vinculación inválida' });
  if (!TIPOS_VINCULACION.includes(body.tipo_vinculacion)) return res.status(400).json({ message: 'Tipo de vinculación inválido' });
  if (requiereEstatuto(body.vinculacion) && !body.estatuto_id) return res.status(400).json({ message: 'Estatuto requerido' });
  const departamentoRepo = AppDataSource.getRepository(Departamento);
  const departamentoOk = await departamentoRepo.findOneBy({ nombre: body.departamento_residencia });
  if (!departamentoOk) return res.status(400).json({ message: 'Departamento de residencia inválido' });

  const [municipioResidencia, municipioLabora, estatuto] = await Promise.all([
    municipioRepo.findOneBy({ id: body.municipio_residencia_id }),
    municipioRepo.findOneBy({ id: body.municipio_donde_labora_id }),
    body.estatuto_id ? estatutoRepo.findOneBy({ id: body.estatuto_id }) : null
  ]);
  if (!municipioResidencia || !municipioLabora) return res.status(400).json({ message: 'Municipio de residencia o donde labora inválido' });
  if (requiereEstatuto(body.vinculacion) && !estatuto) return res.status(400).json({ message: 'Estatuto inválido' });

  const docente = repo.create({
    cedula: body.cedula,
    nombres: body.nombres,
    apellidos: body.apellidos,
    numero_celular: body.numero_celular,
    correo_electronico: body.correo_electronico,
    fecha_nacimiento: body.fecha_nacimiento,
    estatuto: estatuto || null,
    departamento_residencia: body.departamento_residencia,
    municipio_residencia: municipioResidencia,
    direccion_residencia: body.direccion_residencia,
    municipio_donde_labora: municipioLabora,
    institucion_educativa_donde_labora: body.institucion_educativa_donde_labora,
    vinculacion: body.vinculacion,
    tipo_vinculacion: body.tipo_vinculacion,
    estado: body.estado || 'activo'
  } as DeepPartial<Docente>);

  try {
    const saved = await repo.save(docente);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo crear', error: err.message });
  }
});

docentesRouter.get('/:id', async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Docente);
  const docente = await repo.findOne({ where: { id: Number(req.params.id) }, relations: ['municipio_residencia', 'municipio_residencia.departamento_rel', 'municipio_donde_labora', 'municipio_donde_labora.departamento_rel', 'estatuto'] });
  if (!docente) return res.status(404).json({ message: 'No encontrado' });
  res.json(docente);
});

docentesRouter.put('/:id', async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Docente);
  const municipioRepo = AppDataSource.getRepository(Municipio);
  const estatutoRepo = AppDataSource.getRepository(Estatuto);
  const docente = await repo.findOne({ where: { id: Number(req.params.id) }, relations: ['municipio_residencia', 'municipio_donde_labora', 'estatuto'] });
  if (!docente) return res.status(404).json({ message: 'No encontrado' });

  const body = req.body;
  const required = [
    'cedula', 'nombres', 'apellidos', 'numero_celular', 'correo_electronico', 'fecha_nacimiento',
    'departamento_residencia', 'direccion_residencia', 'municipio_residencia_id', 'municipio_donde_labora_id',
    'institucion_educativa_donde_labora', 'vinculacion', 'tipo_vinculacion'
  ];
  const missing = required.filter((f) => body[f] === undefined || body[f] === null || `${body[f]}`.trim() === '');
  if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
  if (!VINCULACIONES.includes(body.vinculacion)) return res.status(400).json({ message: 'Vinculación inválida' });
  if (!TIPOS_VINCULACION.includes(body.tipo_vinculacion)) return res.status(400).json({ message: 'Tipo de vinculación inválido' });
  if (requiereEstatuto(body.vinculacion) && !body.estatuto_id) return res.status(400).json({ message: 'Estatuto requerido' });
  const departamentoRepo = AppDataSource.getRepository(Departamento);
  const departamentoOk = await departamentoRepo.findOneBy({ nombre: body.departamento_residencia });
  if (!departamentoOk) return res.status(400).json({ message: 'Departamento de residencia inválido' });
  const estatuto = body.estatuto_id ? await estatutoRepo.findOneBy({ id: body.estatuto_id }) : null;
  if (requiereEstatuto(body.vinculacion) && !estatuto) return res.status(400).json({ message: 'Estatuto inválido' });
  const municipioResidencia = await municipioRepo.findOneBy({ id: body.municipio_residencia_id });
  const municipioLabora = await municipioRepo.findOneBy({ id: body.municipio_donde_labora_id });
  if (!municipioResidencia || !municipioLabora) return res.status(400).json({ message: 'Municipio de residencia o donde labora inválido' });

  repo.merge(docente, {
    cedula: body.cedula,
    nombres: body.nombres,
    apellidos: body.apellidos,
    numero_celular: body.numero_celular,
    correo_electronico: body.correo_electronico,
    fecha_nacimiento: body.fecha_nacimiento,
    estatuto: estatuto || null,
    departamento_residencia: body.departamento_residencia,
    municipio_residencia: municipioResidencia,
    direccion_residencia: body.direccion_residencia,
    municipio_donde_labora: municipioLabora,
    institucion_educativa_donde_labora: body.institucion_educativa_donde_labora,
    vinculacion: body.vinculacion,
    tipo_vinculacion: body.tipo_vinculacion,
    estado: body.estado || docente.estado
  } as DeepPartial<Docente>);
  try {
    const saved = await repo.save(docente);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo actualizar', error: err.message });
  }
});

docentesRouter.delete('/:id', async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Docente);
  const docente = await repo.findOneBy({ id: Number(req.params.id) });
  if (!docente) return res.status(404).json({ message: 'No encontrado' });
  docente.estado = 'inactivo';
  await repo.save(docente);
  res.json({ message: 'Marcado como inactivo' });
});
