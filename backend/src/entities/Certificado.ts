import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Reunion } from './Reunion';
import { Docente } from './Docente';

@Entity({ name: 'certificados' })
@Unique(['reunion', 'docente'])
export class Certificado {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @ManyToOne(() => Reunion)
  @JoinColumn({ name: 'reunion_id' })
  reunion!: Reunion;

  @ManyToOne(() => Docente)
  @JoinColumn({ name: 'docente_id' })
  docente!: Docente;

  @Column({ type: 'varchar', length: 512 })
  url_pdf!: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  generado_en!: Date;

  @Column({ type: 'char', length: 64, nullable: true })
  hash_verificacion!: string | null;
}
