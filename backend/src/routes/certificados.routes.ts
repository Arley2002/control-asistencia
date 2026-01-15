import { Router } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { requiereAuth, requiereRol } from '../middlewares/auth';
import { AppDataSource } from '../config/data-source';
import { Certificado } from '../entities/Certificado';
import { Reunion } from '../entities/Reunion';
import { Docente } from '../entities/Docente';

export const certificadosRouter = Router();

const logosBasePath = path.resolve(__dirname, '../../public/logos');
const getLogos = (entidad: 'ASOINCA' | 'PROVITEC' | 'OTRA') => {
  const isProvitec = entidad === 'PROVITEC';
  const main = path.join(logosBasePath, isProvitec ? 'provitec.png' : 'asoinca.png');
  const left = path.join(logosBasePath, isProvitec ? 'provitec.png' : 'asoinca.png');
  const right = path.join(logosBasePath, isProvitec ? 'provitec.png' : 'asoinca.png');
  return { main, left, right };
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Generar/registrar certificado (admin)
certificadosRouter.post('/reuniones/:reunionId/docentes/:docenteId', requiereAuth, requiereRol('administrador'), async (req, res) => {
  const reunionId = Number(req.params.reunionId);
  const docenteId = Number(req.params.docenteId);
  const url_pdf = req.body.url_pdf || '';
  const reunion = await AppDataSource.getRepository(Reunion).findOneBy({ id: reunionId });
  const docente = await AppDataSource.getRepository(Docente).findOneBy({ id: docenteId });
  if (!reunion || !docente) return res.status(404).json({ message: 'Reunión o docente no encontrado' });
  const repo = AppDataSource.getRepository(Certificado);
  try {
    const cert = repo.create({ reunion, docente, url_pdf, hash_verificacion: req.body.hash_verificacion || null });
    const saved = await repo.save(cert);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: 'No se pudo crear', error: err.message });
  }
});

// Listar certificados por docente (docente o admin)
certificadosRouter.get('/docentes/:docenteId', requiereAuth, requiereRol('administrador', 'docente'), async (req, res) => {
  const docenteId = Number(req.params.docenteId);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const search = (req.query.search as string) || '';
  const repo = AppDataSource.getRepository(Certificado);
  const qb = repo.createQueryBuilder('c')
    .leftJoinAndSelect('c.reunion', 'r')
    .where('c.docente_id = :id', { id: docenteId });
  if (from) qb.andWhere('r.fecha >= :from', { from });
  if (to) qb.andWhere('r.fecha <= :to', { to });
  if (search) qb.andWhere('r.nombre LIKE :s', { s: `%${search}%` });
  const [data, total] = await qb
    .skip(skip)
    .take(limit)
    .orderBy('r.fecha', 'DESC')
    .getManyAndCount();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// Descargar por id
// Generar PDF on-the-fly a partir de datos (fallback cuando no hay url_pdf)
certificadosRouter.get('/docentes/:docenteId/reuniones/:reunionId/pdf', requiereAuth, requiereRol('administrador', 'docente'), async (req, res) => {
  const docenteId = Number(req.params.docenteId);
  const reunionId = Number(req.params.reunionId);
  const certRepo = AppDataSource.getRepository(Certificado);
  let cert = await certRepo.findOne({
    where: { docente: { id: docenteId }, reunion: { id: reunionId } },
    relations: ['docente', 'docente.municipio_donde_labora', 'docente.municipio_residencia', 'reunion']
  });
  if (!cert) {
    const reunion = await AppDataSource.getRepository(Reunion).findOneBy({ id: reunionId });
    const docente = await AppDataSource.getRepository(Docente).findOne({ where: { id: docenteId }, relations: ['municipio_donde_labora', 'municipio_residencia'] });
    if (!reunion || !docente) return res.status(404).json({ message: 'No encontrado' });
    cert = certRepo.create({ reunion, docente, url_pdf: '', hash_verificacion: null });
  }
  const logos = getLogos(cert.reunion.entidad_convocante);
  const fechaLegible = formatDate(cert.reunion.fecha);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificado-${docenteId}-${reunionId}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.on('error', (err) => {
    res.status(500).json({ message: 'Error generando PDF', error: err.message });
  });
  doc.pipe(res);

  // Marca de agua central
  if (fs.existsSync(logos.main)) {
    doc.save();
    doc.opacity(0.12);
    doc.image(logos.main, doc.page.width / 2 - 200, 140, { width: 400 });
    doc.restore();
  }

  // Logos laterales pequeños
  if (fs.existsSync(logos.left)) {
    doc.image(logos.left, 40, 40, { width: 90 });
  }
  if (fs.existsSync(logos.right)) {
    doc.image(logos.right, doc.page.width - 140, 40, { width: 90 });
  }

  doc.moveDown(2);
  doc.fontSize(11).text('ASOCIACIÓN DE INSTITUTORES Y TRABAJADORES DE LA EDUCACIÓN DEL CAUCA', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(22).font('Helvetica-Bold').text('ASOINCA', { align: 'center' });
  doc.moveDown(1.2);
  doc.fontSize(13).font('Helvetica-Bold').text('LA JUNTA DIRECTIVA DEPARTAMENTAL', { align: 'center' });
  doc.fontSize(13).font('Helvetica-Bold').text('CERTIFICA QUE:', { align: 'center' });

  doc.moveDown(1);
  const muniLabora = cert.docente.municipio_donde_labora?.nombre || cert.docente.municipio_residencia?.nombre || '___________';
  const institucion = cert.docente.institucion_educativa_donde_labora || '___________';
  doc.fontSize(12).font('Helvetica').text(
    `Él (La) docente ${cert.docente.apellidos} ${cert.docente.nombres} identificado(a) con C.C. ${cert.docente.cedula}, quien labora en el establecimiento educativo ${institucion}, del municipio de ${muniLabora}, asistió a la convocatoria/reunión "${cert.reunion.nombre}" de manera activa, consecuente y responsable, que se llevó a cabo el día ${fechaLegible}.`,
    { align: 'justify' }
  );

  doc.moveDown(1);
  doc.text('Para constancia se firma en Popayán.', { align: 'left' });
  doc.moveDown(1.5);
  doc.text('JUNTA DIRECTIVA DEPARTAMENTAL DE ASOINCA', { align: 'center', underline: true });

  doc.end();
});

// Listado consolidado por rango para admin (reutiliza filtros)
certificadosRouter.get('/docentes/:docenteId/rango', requiereAuth, requiereRol('administrador'), async (req, res) => {
  const docenteId = Number(req.params.docenteId);
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const repo = AppDataSource.getRepository(Certificado);
  const qb = repo.createQueryBuilder('c')
    .leftJoinAndSelect('c.reunion', 'r')
    .where('c.docente_id = :id', { id: docenteId });
  if (from) qb.andWhere('r.fecha >= :from', { from });
  if (to) qb.andWhere('r.fecha <= :to', { to });
  const data = await qb.orderBy('r.fecha', 'DESC').getMany();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data, total: data.length });
});

// Descargar por id
certificadosRouter.get('/:id', requiereAuth, async (req, res) => {
  const repo = AppDataSource.getRepository(Certificado);
  const cert = await repo.findOne({ where: { id: Number(req.params.id) }, relations: ['reunion', 'docente'] });
  if (!cert) return res.status(404).json({ message: 'No encontrado' });
  res.json(cert); // En producción, redirigir/stream del PDF
});
