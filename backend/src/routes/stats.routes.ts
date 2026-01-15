import { Router } from 'express';
import { MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { Docente } from '../entities/Docente';
import { Reunion } from '../entities/Reunion';
import { Usuario } from '../entities/Usuario';

export const statsRouter = Router();

statsRouter.use(requiereAuth, requiereRol('administrador'));

statsRouter.get('/admin', async (_req, res) => {
  const docenteRepo = AppDataSource.getRepository(Docente);
  const reunionRepo = AppDataSource.getRepository(Reunion);
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const today = new Date().toISOString().slice(0, 10);

  const [
    docentesTotal,
    docentesActivos,
    docentesInactivos,
    reunionesTotal,
    reunionesProximas,
    usuariosTotal,
    usuariosActivos,
    usuariosInactivos
  ] = await Promise.all([
    docenteRepo.count(),
    docenteRepo.count({ where: { estado: 'activo' } }),
    docenteRepo.count({ where: { estado: 'inactivo' } }),
    reunionRepo.count(),
    reunionRepo.count({ where: { fecha: MoreThanOrEqual(today) } }),
    usuarioRepo.count(),
    usuarioRepo.count({ where: { estado: 'activo' } }),
    usuarioRepo.count({ where: { estado: 'inactivo' } })
  ]);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    docentes: { total: docentesTotal, activos: docentesActivos, inactivos: docentesInactivos },
    reuniones: { total: reunionesTotal, proximas: reunionesProximas },
    usuarios: { total: usuariosTotal, activos: usuariosActivos, inactivos: usuariosInactivos }
  });
});
