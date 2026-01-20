import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'tipos_vinculacion' })
export class TipoVinculacion {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  nombre!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;
}
