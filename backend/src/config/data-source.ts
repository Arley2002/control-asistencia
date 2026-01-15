import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { Rol } from '../entities/Rol';
import { Usuario } from '../entities/Usuario';
import { Municipio } from '../entities/Municipio';
import { Departamento } from '../entities/Departamento';
import { Docente } from '../entities/Docente';
import { Reunion } from '../entities/Reunion';
import { Asistencia } from '../entities/Asistencia';
import { Certificado } from '../entities/Certificado';
import { Estatuto } from '../entities/Estatuto';
import { EstadoLaboral } from '../entities/EstadoLaboral';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.pass,
  database: env.db.name,
  entities: [Rol, Usuario, Departamento, Municipio, Estatuto, EstadoLaboral, Docente, Reunion, Asistencia, Certificado],
  synchronize: false, // Usa migraciones en producción
  logging: false
});
