import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
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
    relations: ['reunion', 'docente', 'docente.municipio_donde_labora', 'docente.municipio_residencia']
  });

  // Si no existe el registro, intentar generar usando datos de reunión y docente
  if (!cert) {
    const reunion = await AppDataSource.getRepository(Reunion).findOneBy({ id: reunionId });
    const docente = await AppDataSource.getRepository(Docente).findOne({ where: { id: docenteId }, relations: ['municipio_donde_labora', 'municipio_residencia'] });
    if (!reunion || !docente) return res.status(404).json({ message: 'Reunión o docente no encontrado para generar certificado' });
    cert = certRepo.create({ reunion, docente, url_pdf: '', hash_verificacion: null });
  }

  // Si hay URL y es externa, redirigir
  if (cert.url_pdf && /^https?:\/\//i.test(cert.url_pdf)) {
    return res.redirect(cert.url_pdf);
  }

  // Si hay ruta local y existe, servir archivo
  if (cert.url_pdf) {
    const pdfPath = path.isAbsolute(cert.url_pdf)
      ? cert.url_pdf
      : path.resolve(__dirname, '../../public', cert.url_pdf.replace(/^\//, ''));
    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificado-${docenteId}-${reunionId}.pdf"`);
      return fs.createReadStream(pdfPath).pipe(res);
    }
  }

  // Fallback: generar on-the-fly si no hay PDF almacenado
  const entidadConv = (cert.reunion.entidad_convocante || '').toUpperCase().trim();
  const entidadClave = entidadConv.includes('PROVITEC')
    ? 'PROVITEC'
    : entidadConv.includes('ASOINCA')
      ? 'ASOINCA'
      : 'OTRA';
  const logos = getLogos(entidadClave);
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
    doc.image(logos.left, 40, 40, { width: 65 });
  }
  if (fs.existsSync(logos.right)) {
    doc.image(logos.right, doc.page.width - 115, 40, { width: 65 });
  }

  const addCedulaWatermark = () => {
    if (!cert.docente?.cedula) return;
    const text = `CC ${cert.docente.cedula}`;
    const prevY = doc.y;
    doc.save();
    doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.opacity(0.08);
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#0f172a');
    for (let y = 40; y < doc.page.height + 80; y += 180) {
      for (let x = -60; x < doc.page.width + 120; x += 200) {
        doc.text(text, x, y, { align: 'center', lineBreak: false });
      }
    }
    doc.restore();
    doc.y = prevY;
    doc.fillColor('black');
  };

  const renderAsoinca = () => {
    doc.fillColor('black').opacity(1).font('Helvetica');
    doc.moveDown(1);
    doc.font('Times-BoldItalic').fontSize(8).text('ASOCIACIÓN DE INSTITUTORES Y TRABAJADORES DE LA EDUCACIÓN DEL CAUCA', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica-Bold').text('ASOINCA', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Times-BoldItalic').fontSize(8).text('NIT PERSONERIA JURIDICA', { align: 'center' });
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(10).text(`Convoca: ${cert.reunion.entidad_convocante || 'ASOINCA'}`, { align: 'center' });
    doc.moveDown(5.4);
    doc.fontSize(12).font('Helvetica-Bold').text('LA JUNTA DIRECTIVA DEPARTAMENTAL DE LA ASOCIACIÓN DE INSTITUTORES Y TRABAJADORES DE LA EDUCACIÓN DEL CAUCA, ASOINCA ', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('CERTIFICA QUE:', { align: 'center' });

    doc.moveDown(1);
    const muniLabora = cert.docente.municipio_donde_labora?.nombre || cert.docente.municipio_residencia?.nombre || '___________';
    const institucion = cert.docente.institucion_educativa_donde_labora || '___________';
    doc.fontSize(12).font('Helvetica').text(
      `Él (La) docente ${cert.docente.apellidos} ${cert.docente.nombres} identificado(a) con C.C. ${cert.docente.cedula}, quien labora en el establecimiento educativo ${institucion}, del municipio de ${muniLabora}, asistió a la convocatoria/reunión "${cert.reunion.nombre}" de manera activa, consecuente y responsable, que se llevó a cabo el día ${fechaLegible}.`,
      { align: 'justify' }
    );

    doc.moveDown(1);
    doc.text('Para constancia se firma en Popayán.', { align: 'left' });
    doc.moveDown(8);
    doc.font('Helvetica-Bold').fontSize(10).text('FERNANDO VARGAS NAVIA', {align: 'left'});
    doc.font('Helvetica-Bold').fontSize(8).text('Presidente de ASOINCA', { align: 'left' });
    doc.font('Helvetica-Bold').fontSize(10).text('JOSE AURELINO GUZMAN PINO', { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8).text('Secretario General de ASOINCA', { align: 'right' });
    doc.moveDown(15);
    doc.font('Helvetica-Bold').fontSize(11).text('JUNTA DIRECTIVA DEPARTAMENTAL DE ASOINCA', { align: 'center'});
    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('red').text('hombre es algo más que ser torpemente vivo: es entender una misión, ennoblecerla y cumplirla", José Martí', { align: 'center' });
    doc.moveDown(1.5);
    doc.font('Helvetica').fillColor('black').text('Calle 5ª Nº 12-55 Barrio Valencia - Popayán – Cauca – Colombia | Tel: 8 223507 | Fax: 8 244159 | E-mail: asoinca1@gmail.com www.asoinca.com', { align: 'center' });
  };

  const renderProvitec = () => {
    doc.fillColor('black').opacity(1).font('Helvetica');
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(12).text('PROVITEC', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).text('Programa de Virtualidad y Tecnología', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).text(`Convoca: ${cert.reunion.entidad_convocante}`, { align: 'center' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(13).text('CERTIFICA QUE:', { align: 'center' });

    doc.moveDown(1);
    const muniLabora = cert.docente.municipio_donde_labora?.nombre || cert.docente.municipio_residencia?.nombre || '___________';
    const institucion = cert.docente.institucion_educativa_donde_labora || '___________';
    doc.font('Helvetica').fontSize(12).text(
      `El(La) participante ${cert.docente.apellidos} ${cert.docente.nombres}, identificado(a) con C.C. ${cert.docente.cedula}, adscrito(a) a la institución ${institucion} del municipio de ${muniLabora}, participó en la actividad "${cert.reunion.nombre}" realizada el día ${fechaLegible}, cumpliendo los requisitos del programa PROVITEC.`,
      { align: 'justify' }
    );

    doc.moveDown(2);
    doc.text('Se expide el presente certificado para los fines pertinentes.', { align: 'left' });
    doc.moveDown(6);
    doc.font('Helvetica-Bold').fontSize(10).text('Coordinación PROVITEC', { align: 'center' });
    doc.font('Helvetica').fontSize(9).text('Popayán - Cauca', { align: 'center' });
  };

  const renderGenerico = () => {
    doc.fillColor('black').opacity(1).font('Helvetica');
    doc.moveDown(1);
    const entidad = cert.reunion.entidad_convocante || 'Entidad convocante';
    doc.font('Helvetica-Bold').fontSize(12).text(entidad, { align: 'center' });
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(13).text('CERTIFICA QUE:', { align: 'center' });

    doc.moveDown(1);
    const muniLabora = cert.docente.municipio_donde_labora?.nombre || cert.docente.municipio_residencia?.nombre || '___________';
    const institucion = cert.docente.institucion_educativa_donde_labora || '___________';
    doc.font('Helvetica').fontSize(12).text(
      `El(La) participante ${cert.docente.apellidos} ${cert.docente.nombres}, identificado(a) con C.C. ${cert.docente.cedula}, vinculado(a) a la institución ${institucion} del municipio de ${muniLabora}, asistió a la actividad "${cert.reunion.nombre}" realizada el día ${fechaLegible}.`,
      { align: 'justify' }
    );

    doc.moveDown(2);
    doc.text('Se expide para los fines pertinentes.', { align: 'left' });
    doc.moveDown(6);
    doc.font('Helvetica-Bold').fontSize(10).text(entidad, { align: 'center' });
    doc.font('Helvetica').fontSize(9).text('Popayán - Cauca', { align: 'center' });
  };

  // Asegurar que el contenido principal se dibuje con opacidad y color completos
  doc.opacity(1).fillColor('black');

  if (entidadClave === 'PROVITEC') {
    renderProvitec();
  } else if (entidadClave === 'ASOINCA') {
    renderAsoinca();
  } else {
    renderGenerico();
  }

  // Poner marca de agua al final para garantizar que el texto no quede oculto
  addCedulaWatermark();

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
