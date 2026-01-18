import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Municipio } from './Municipio';
import { Usuario } from './Usuario';
import { Estatuto } from './Estatuto';

@Entity({ name: 'docentes' })
export class Docente {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  cedula!: string;

  @Column({ type: 'varchar', length: 120 })
  nombres!: string;

  @Column({ type: 'varchar', length: 120 })
  apellidos!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  numero_celular!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  correo_electronico!: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento!: string | null;

  @ManyToOne(() => Estatuto, { nullable: true })
  @JoinColumn({ name: 'estatuto_id' })
  estatuto!: Estatuto | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  departamento_residencia!: string | null;

  @ManyToOne(() => Municipio, { nullable: true })
  @JoinColumn({ name: 'municipio_residencia_id' })
  municipio_residencia!: Municipio | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  direccion_residencia!: string | null;

  @ManyToOne(() => Municipio, { nullable: true })
  @JoinColumn({ name: 'municipio_donde_labora_id' })
  municipio_donde_labora!: Municipio | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  institucion_educativa_donde_labora!: string | null;

  @Column({
    type: 'enum',
    enum: ['docente', 'directivo_docente', 'administrativo', 'pensionado'],
    default: 'docente'
  })
  vinculacion!: 'docente' | 'directivo_docente' | 'administrativo' | 'pensionado';

  @Column({
    type: 'enum',
    enum: [
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
    ],
    default: 'propiedad'
  })
  tipo_vinculacion!:
    | 'propiedad'
    | 'provisional_definitivo'
    | 'provisional_temporal'
    | 'oferente'
    | 'rector_propiedad'
    | 'rector_encargo'
    | 'coordinador_propiedad'
    | 'coordinador_encargo'
    | 'director_rural_propiedad'
    | 'director_rural_encargo'
    | 'administrativo_propiedad'
    | 'administrativo_provisional'
    | 'pensionado_activo'
    | 'pensionado_retirado';

  @OneToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario | null;

  @Column({ type: 'enum', enum: ['activo', 'inactivo'], default: 'activo' })
  estado!: 'activo' | 'inactivo';

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}
