import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Block } from './block.entity';

@Entity('building')
export class Building {
  @PrimaryGeneratedColumn()
  building_id: number;

  @Column()
  block_id: number;

  @ManyToOne(() => Block)
  @JoinColumn({ name: 'block_id' })
  block: Block;

  @Column({ type: 'varchar', length: 100 })
  building_name: string;
}
