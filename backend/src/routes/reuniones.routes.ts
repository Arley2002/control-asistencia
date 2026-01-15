import { Router, Request, Response } from 'express';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Reunion } from '../entities/Reunion';

export const reunionesRouter = Router();

reunionesRouter.use(requiereAuth);

// Listar con visibilidad por rol
reunionesRouter.get('/', async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const visible = (req as any).user?.rol === 'secretario';
  const search = (req.query.search as string) || '';
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const repo = AppDataSource.getRepository(Reunion);
  const baseQb = repo.createQueryBuilder('r').where('1=1');
  if (visible) baseQb.andWhere('r.visible_secretario = true');
  if (search) baseQb.andWhere('r.nombre LIKE :s', { s: `%${search}%` });
  if (from) baseQb.andWhere('r.fecha >= :from', { from });
  if (to) baseQb.andWhere('r.fecha <= :to', { to });

  const total = await baseQb.clone().getCount();

  const qb = baseQb
    .clone()
    .leftJoin('asistencias', 'a', 'a.reunion_id = r.id')
    .addSelect('COUNT(a.id)', 'asistentes_count')
    .groupBy('r.id')
    .orderBy('r.created_at', 'DESC')
    .skip(skip)
    .take(limit);

  const { entities, raw } = await qb.getRawAndEntities();
  const data = entities.map((r, idx) => ({
    ...r,
    asistentes_count: Number(raw[idx]?.asistentes_count) || 0
  }));
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// Crear (solo admin)
reunionesRouter.post('/', requiereRol('administrador'), async (req, res) => {
  const repo = AppDataSource.getRepository(Reunion);
  const reunion = repo.create(req.body);
  try {
    const saved = await repo.save(reunion);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo crear', error: err.message });
  }
});

reunionesRouter.get('/:id', async (req, res) => {
  const repo = AppDataSource.getRepository(Reunion);
  const reunion = await repo.findOneBy({ id: Number(req.params.id) });
  if (!reunion) return res.status(404).json({ message: 'No encontrada' });
  if ((req as any).user?.rol === 'secretario' && !reunion.visible_secretario) {
    return res.status(403).json({ message: 'No autorizada' });
  }
  res.json(reunion);
});

reunionesRouter.put('/:id', requiereRol('administrador'), async (req, res) => {
  const repo = AppDataSource.getRepository(Reunion);
  const reunion = await repo.findOneBy({ id: Number(req.params.id) });
  if (!reunion) return res.status(404).json({ message: 'No encontrada' });
  repo.merge(reunion, req.body);
  try {
    const saved = await repo.save(reunion);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo actualizar', error: err.message });
  }
});

reunionesRouter.delete('/:id', requiereRol('administrador'), async (req, res) => {
  const repo = AppDataSource.getRepository(Reunion);
  const reunion = await repo.findOneBy({ id: Number(req.params.id) });
  if (!reunion) return res.status(404).json({ message: 'No encontrada' });
  await repo.delete(reunion.id);
  res.json({ message: 'Eliminada' });
});
