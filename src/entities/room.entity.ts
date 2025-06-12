import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Building } from './building.entity';

@Entity('room')
export class Room {
  @PrimaryGeneratedColumn()
  room_id: number;

  @Column()
  building_id: number;

  @ManyToOne(() => Building)
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @Column({ type: 'varchar', length: 100 })
  room_name: string;
}
