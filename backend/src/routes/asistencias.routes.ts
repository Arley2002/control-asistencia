import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Reunion } from '../entities/Reunion';
import { Docente } from '../entities/Docente';
import { Asistencia } from '../entities/Asistencia';
import { Usuario } from '../entities/Usuario';
import { parse } from 'csv-parse';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const asistenciasRouter = Router();

const parseFechaHoraLocal = (value: string): Date | null => {
  const raw = (value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T]+(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;
  let [, y, m, d, hh, mm, mer] = match;
  let hour = Number(hh);
  const minute = Number(mm);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (mer) {
    const upper = mer.toUpperCase();
    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;
  }
  return new Date(Number(y), Number(m) - 1, Number(d), hour, minute, 0, 0);
};

// Carga masiva CSV (secretario y admin)
asistenciasRouter.post('/reuniones/:id/csv', requiereAuth, requiereRol('secretario', 'administrador'), upload.single('file'), async (req: Request, res: Response) => {
  const reunionId = Number(req.params.id);
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'Archivo requerido' });
  const reunionRepo = AppDataSource.getRepository(Reunion);
  const asistenciaRepo = AppDataSource.getRepository(Asistencia);
  const docenteRepo = AppDataSource.getRepository(Docente);
  const reunion = await reunionRepo.findOneBy({ id: reunionId });
  if (!reunion) return res.status(404).json({ message: 'Reunión no encontrada' });

  const rows: { cedula: string; fecha_hora: Date }[] = [];
  const cedulasSet = new Set<string>();
  const errors: string[] = [];

  const parser = parse(file.buffer, {
    delimiter: [',', ';'],
    columns: ['cedula', 'fecha_hora'],
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
  });

  for await (const record of parser) {
    const cedula = (record.cedula || '').trim();
    if (!cedula) {
      errors.push('Fila sin cédula');
      continue;
    }
    const fecha = parseFechaHoraLocal(record.fecha_hora);
    if (!fecha || isNaN(fecha.getTime())) {
      errors.push(`Fecha inválida: ${record.fecha_hora}`);
      continue;
    }
    rows.push({ cedula, fecha_hora: fecha });
    cedulasSet.add(cedula);
  }

  if (!rows.length) return res.status(400).json({ message: 'No se encontraron registros válidos' });

  const cedulas = Array.from(cedulasSet);
  const docentesMap = new Map<string, number>();
  const chunkSize = 500;

  for (let i = 0; i < cedulas.length; i += chunkSize) {
    const chunk = cedulas.slice(i, i + chunkSize);
    const docentes = await docenteRepo
      .createQueryBuilder('d')
      .select(['d.id', 'd.cedula'])
      .where('d.cedula IN (:...cedulas)', { cedulas: chunk })
      .getMany();
    docentes.forEach((d) => docentesMap.set(d.cedula, d.id));
  }

  const values: { reunion_id: number; docente_id: number; fecha_hora: Date }[] = [];
  for (const row of rows) {
    const docenteId = docentesMap.get(row.cedula);
    if (!docenteId) {
      errors.push(`Cédula no existe: ${row.cedula}`);
      continue;
    }
    values.push({ reunion_id: reunionId, docente_id: docenteId, fecha_hora: row.fecha_hora });
  }

  let inserted = 0;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const result = await asistenciaRepo
      .createQueryBuilder()
      .insert()
      .into('asistencias')
      .values(chunk)
      .orIgnore()
      .execute();
    const affected = typeof result.raw?.affectedRows === 'number' ? result.raw.affectedRows : result.identifiers.length;
    inserted += affected;
  }

  res.json({ insertados: inserted, errores: errors });
});

// Listar asistencias por reunión (admin/secretario)
asistenciasRouter.get('/reuniones/:id', requiereAuth, requiereRol('secretario', 'administrador'), async (req: Request, res: Response) => {
  const reunionId = Number(req.params.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const repo = AppDataSource.getRepository(Asistencia);
  const qb = repo.createQueryBuilder('a')
    .leftJoinAndSelect('a.docente', 'd')
    .where('a.reunion_id = :rid', { rid: reunionId });
  if (search) qb.andWhere('(d.cedula LIKE :s OR d.nombres LIKE :s OR d.apellidos LIKE :s)', { s: `%${search}%` });
  const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
  res.json({ data, total, page, limit });
});

// Asistencias del docente autenticado
asistenciasRouter.get('/mias', requiereAuth, requiereRol('docente'), async (req: Request, res: Response) => {
  const userId = (req as any).user.sub;
  const user = await AppDataSource.getRepository(Usuario).findOne({ where: { id: userId } });
  const docenteRepo = AppDataSource.getRepository(Docente);
  let docente = await docenteRepo.findOne({ where: { usuario: { id: userId } } });
  if (!docente && user?.username) {
    // Fallback: buscar por cédula/username si aún no está vinculado
    docente = await docenteRepo.findOne({ where: { cedula: user.username } });
    if (docente) {
      docente.usuario = user;
      await docenteRepo.save(docente);
    }
  }
  if (!docente) return res.status(404).json({ message: 'Docente no encontrado' });
  const docenteId = docente.id;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const search = (req.query.search as string) || '';
  const repo = AppDataSource.getRepository(Asistencia);
  const qb = repo.createQueryBuilder('a')
    .leftJoinAndSelect('a.reunion', 'r')
    .where('a.docente_id = :id', { id: docenteId });
  if (from) qb.andWhere('a.fecha_hora >= :from', { from });
  if (to) qb.andWhere('a.fecha_hora <= :to', { to });
  if (search) qb.andWhere('r.nombre LIKE :s', { s: `%${search}%` });
  const [data, total] = await qb
    .skip(skip).take(limit)
    .orderBy('a.fecha_hora', 'DESC')
    .getManyAndCount();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// Asistencias por docente (admin) con rango opcional
asistenciasRouter.get('/docentes/:id', requiereAuth, requiereRol('administrador'), async (req: Request, res: Response) => {
  const docenteId = Number(req.params.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const search = (req.query.search as string) || '';
  const repo = AppDataSource.getRepository(Asistencia);
  const qb = repo.createQueryBuilder('a')
    .leftJoinAndSelect('a.reunion', 'r')
    .where('a.docente_id = :id', { id: docenteId });
  if (from) qb.andWhere('r.fecha >= :from', { from });
  if (to) qb.andWhere('r.fecha <= :to', { to });
  if (search) qb.andWhere('r.nombre LIKE :s', { s: `%${search}%` });
  const [data, total] = await qb
    .orderBy('r.fecha', 'DESC')
    .skip(skip)
    .take(limit)
    .getManyAndCount();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});
