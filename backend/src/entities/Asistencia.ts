import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Reunion } from './Reunion';
import { Docente } from './Docente';

@Entity({ name: 'asistencias' })
@Unique(['reunion', 'docente'])
export class Asistencia {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @ManyToOne(() => Reunion)
  @JoinColumn({ name: 'reunion_id' })
  reunion!: Reunion;

  @ManyToOne(() => Docente)
  @JoinColumn({ name: 'docente_id' })
  docente!: Docente;

  @Column({ type: 'datetime' })
  fecha_hora!: Date;
}
