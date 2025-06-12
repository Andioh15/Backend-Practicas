import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Campus } from './campuses.entity';

@Entity('blocks')
export class Blocks {
  @PrimaryGeneratedColumn()
  block_id: number;

  @Column()
  campus_id: number;

  @ManyToOne(() => Campus)
  @JoinColumn({ name: 'campus_id' })
  campus: Campus;

  @Column({ type: 'varchar', length: 100 })
  block_name: string;
}
