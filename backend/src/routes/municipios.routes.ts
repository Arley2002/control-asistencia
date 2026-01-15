import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { Municipio } from '../entities/Municipio';
import { Departamento } from '../entities/Departamento';

export const municipiosRouter = Router();

// Lista de departamentos disponibles
municipiosRouter.get('/departamentos', async (_req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Departamento);
  const data = await repo.find({ order: { nombre: 'ASC' } });
  res.json({ data: data.map((d) => d.nombre) });
});

// Lista de municipios, filtrable por departamento
municipiosRouter.get('/', async (req: Request, res: Response) => {
  const departamento = (req.query.departamento as string) || '';
  let departamentoId = req.query.departamento_id ? Number(req.query.departamento_id) : undefined;
  const search = (req.query.search as string) || '';
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const repo = AppDataSource.getRepository(Municipio);
  // Si solo viene el nombre, intenta resolver el id para filtrar por FK
  if (!departamentoId && departamento) {
    const depRepo = AppDataSource.getRepository(Departamento);
    const depEntity = await depRepo.findOne({ where: { nombre: departamento } });
    if (depEntity) departamentoId = depEntity.id;
  }

  const qb = repo.createQueryBuilder('m').leftJoinAndSelect('m.departamento_rel', 'd').orderBy('m.nombre', 'ASC');
  if (departamentoId) {
    qb.where('m.departamento_id = :depId', { depId: departamentoId });
  } else if (departamento) {
    qb.where('d.nombre = :dep', { dep: departamento });
  }
  if (search) {
    qb.andWhere('m.nombre LIKE :s', { s: `%${search}%` });
  }
  const data = await qb.take(limit).getMany();
  res.json({ data });
});
