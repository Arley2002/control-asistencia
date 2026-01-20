import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'vinculaciones' })
export class Vinculacion {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  codigo!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  nombre!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;
}
