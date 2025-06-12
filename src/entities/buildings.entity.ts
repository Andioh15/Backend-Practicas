import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Blocks } from './blocks.entity';

@Entity('buildings')
export class Buildings {
  @PrimaryGeneratedColumn()
  building_id: number;

  @Column()
  block_id: number;

  @ManyToOne(() => Blocks)
  @JoinColumn({ name: 'block_id' })
  block: Blocks;

  @Column({ type: 'varchar', length: 100 })
  building_name: string;
}
