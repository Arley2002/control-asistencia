import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Departamento } from './Departamento';

@Entity({ name: 'municipios' })
export class Municipio {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  nombre!: string;

  @ManyToOne(() => Departamento, { nullable: true })
  @JoinColumn({ name: 'departamento_id' })
  departamento_rel!: Departamento | null;
}
