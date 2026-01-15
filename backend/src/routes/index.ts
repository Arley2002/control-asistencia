import { Router } from 'express';
import { authRouter } from './auth.routes';
import { docentesRouter } from './docentes.routes';
import { reunionesRouter } from './reuniones.routes';
import { asistenciasRouter } from './asistencias.routes';
import { certificadosRouter } from './certificados.routes';
import { usuariosRouter } from './usuarios.routes';
import { statsRouter } from './stats.routes';
import { municipiosRouter } from './municipios.routes';

export const router = Router();

router.use('/auth', authRouter);
router.use('/docentes', docentesRouter);
router.use('/reuniones', reunionesRouter);
router.use('/asistencias', asistenciasRouter);
router.use('/certificados', certificadosRouter);
router.use('/usuarios', usuariosRouter);
router.use('/stats', statsRouter);
router.use('/municipios', municipiosRouter);
