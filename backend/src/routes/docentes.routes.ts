import { Router, Request, Response } from 'express';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Docente } from '../entities/Docente';
import { Municipio } from '../entities/Municipio';
import { DeepPartial } from 'typeorm';
import { Departamento } from '../entities/Departamento';
import { Estatuto } from '../entities/Estatuto';
import { EstadoLaboral } from '../entities/EstadoLaboral';
import { Usuario } from '../entities/Usuario';

export const docentesRouter = Router();

// Acceso para docentes a su propia ficha
docentesRouter.get('/me', requiereAuth, requiereRol('docente', 'administrador'), async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const repo = AppDataSource.getRepository(Docente);
  const docente = await repo.findOne({ where: { usuario: { id: userId } }, relations: ['usuario', 'municipio_residencia', 'municipio_residencia.departamento_rel', 'municipio_donde_labora', 'municipio_donde_labora.departamento_rel', 'estatuto', 'estado_laboral'] });
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
  const estadoRepo = AppDataSource.getRepository(EstadoLaboral);
  const docente = await repo.findOne({ where: { usuario: { id: userId } }, relations: ['usuario', 'municipio_residencia', 'municipio_residencia.departamento_rel', 'municipio_donde_labora', 'municipio_donde_labora.departamento_rel', 'estatuto', 'estado_laboral'] });
  if (!docente) return res.status(404).json({ message: 'Docente no encontrado' });
  const allowed: DeepPartial<Docente> = {
    nombres: req.body.nombres,
    apellidos: req.body.apellidos,
    numero_celular: req.body.numero_celular,
    correo_electronico: req.body.correo_electronico,
    fecha_nacimiento: req.body.fecha_nacimiento,
    departamento_residencia: req.body.departamento_residencia,
    direccion_residencia: req.body.direccion_residencia,
    institucion_educativa_donde_labora: req.body.institucion_educativa_donde_labora
  };
  if (req.body.municipio_residencia_id) {
    docente.municipio_residencia = (await municipioRepo.findOneBy({ id: req.body.municipio_residencia_id })) || null;
  }
  if (req.body.municipio_donde_labora_id) {
    docente.municipio_donde_labora = (await municipioRepo.findOneBy({ id: req.body.municipio_donde_labora_id })) || null;
  }
  if (req.body.estatuto_id) {
    docente.estatuto = (await estatutoRepo.findOneBy({ id: req.body.estatuto_id })) || null;
  }
  if (req.body.estado_laboral_id) {
    const estado = await estadoRepo.findOneBy({ id: req.body.estado_laboral_id });
    if (estado) docente.estado_laboral = estado;
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

// Rutas admin
// Catálogos para selects (docentes y admin)
docentesRouter.get('/catalogos', requiereAuth, requiereRol('docente', 'administrador'), async (_req: Request, res: Response) => {
  const estatutoRepo = AppDataSource.getRepository(Estatuto);
  const estadoRepo = AppDataSource.getRepository(EstadoLaboral);
  const [estatutos, estadosLaborales] = await Promise.all([
    estatutoRepo.find({ order: { nombre: 'ASC' } }),
    estadoRepo.find({ order: { nombre: 'ASC' } })
  ]);
  res.json({ estatutos, estadosLaborales });
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
    .leftJoinAndSelect('d.estado_laboral', 'el')
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
  const estadoRepo = AppDataSource.getRepository(EstadoLaboral);
  const body = req.body;
  if (Array.isArray(body)) return res.status(400).json({ message: 'Solo se acepta un docente' });

  const required = [
    'cedula', 'nombres', 'apellidos', 'numero_celular', 'correo_electronico', 'fecha_nacimiento', 'estatuto_id',
    'departamento_residencia', 'direccion_residencia', 'municipio_residencia_id', 'municipio_donde_labora_id',
    'institucion_educativa_donde_labora', 'estado_laboral_id'
  ];
  const missing = required.filter((f) => body[f] === undefined || body[f] === null || `${body[f]}`.trim() === '');
  if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
  const departamentoRepo = AppDataSource.getRepository(Departamento);
  const departamentoOk = await departamentoRepo.findOneBy({ nombre: body.departamento_residencia });
  if (!departamentoOk) return res.status(400).json({ message: 'Departamento de residencia inválido' });

  const [municipioResidencia, municipioLabora, estatuto, estadoLaboral] = await Promise.all([
    municipioRepo.findOneBy({ id: body.municipio_residencia_id }),
    municipioRepo.findOneBy({ id: body.municipio_donde_labora_id }),
    estatutoRepo.findOneBy({ id: body.estatuto_id }),
    estadoRepo.findOneBy({ id: body.estado_laboral_id })
  ]);
  if (!municipioResidencia || !municipioLabora) return res.status(400).json({ message: 'Municipio de residencia o donde labora inválido' });
  if (!estatuto) return res.status(400).json({ message: 'Estatuto inválido' });
  if (!estadoLaboral) return res.status(400).json({ message: 'Estado laboral inválido' });

  const docente = repo.create({
    cedula: body.cedula,
    nombres: body.nombres,
    apellidos: body.apellidos,
    numero_celular: body.numero_celular,
    correo_electronico: body.correo_electronico,
    fecha_nacimiento: body.fecha_nacimiento,
    estatuto,
    departamento_residencia: body.departamento_residencia,
    municipio_residencia: municipioResidencia,
    direccion_residencia: body.direccion_residencia,
    municipio_donde_labora: municipioLabora,
    institucion_educativa_donde_labora: body.institucion_educativa_donde_labora,
    estado_laboral: estadoLaboral,
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
  const docente = await repo.findOne({ where: { id: Number(req.params.id) }, relations: ['municipio_residencia', 'municipio_residencia.departamento_rel', 'municipio_donde_labora', 'municipio_donde_labora.departamento_rel', 'estatuto', 'estado_laboral'] });
  if (!docente) return res.status(404).json({ message: 'No encontrado' });
  res.json(docente);
});

docentesRouter.put('/:id', async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Docente);
  const municipioRepo = AppDataSource.getRepository(Municipio);
  const estatutoRepo = AppDataSource.getRepository(Estatuto);
  const estadoRepo = AppDataSource.getRepository(EstadoLaboral);
  const docente = await repo.findOne({ where: { id: Number(req.params.id) }, relations: ['municipio_residencia', 'municipio_donde_labora', 'estatuto', 'estado_laboral'] });
  if (!docente) return res.status(404).json({ message: 'No encontrado' });

  const body = req.body;
  const required = [
    'cedula', 'nombres', 'apellidos', 'numero_celular', 'correo_electronico', 'fecha_nacimiento', 'estatuto_id',
    'departamento_residencia', 'direccion_residencia', 'municipio_residencia_id', 'municipio_donde_labora_id',
    'institucion_educativa_donde_labora', 'estado_laboral_id'
  ];
  const missing = required.filter((f) => body[f] === undefined || body[f] === null || `${body[f]}`.trim() === '');
  if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
  const departamentoRepo = AppDataSource.getRepository(Departamento);
  const departamentoOk = await departamentoRepo.findOneBy({ nombre: body.departamento_residencia });
  if (!departamentoOk) return res.status(400).json({ message: 'Departamento de residencia inválido' });
  const estatuto = await estatutoRepo.findOneBy({ id: body.estatuto_id });
  if (!estatuto) return res.status(400).json({ message: 'Estatuto inválido' });
  const estadoLaboral = await estadoRepo.findOneBy({ id: body.estado_laboral_id });
  if (!estadoLaboral) return res.status(400).json({ message: 'Estado laboral inválido' });

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
    estatuto,
    departamento_residencia: body.departamento_residencia,
    municipio_residencia: municipioResidencia,
    direccion_residencia: body.direccion_residencia,
    municipio_donde_labora: municipioLabora,
    institucion_educativa_donde_labora: body.institucion_educativa_donde_labora,
    estado_laboral: estadoLaboral,
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
