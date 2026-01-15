import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from './Usuario';

@Entity({ name: 'reuniones' })
export class Reunion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ type: 'enum', enum: ['ASOINCA', 'PROVITEC', 'OTRA'], default: 'ASOINCA' })
  entidad_convocante!: 'ASOINCA' | 'PROVITEC' | 'OTRA';

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'bool', default: true })
  visible_secretario!: boolean;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: Usuario | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}
