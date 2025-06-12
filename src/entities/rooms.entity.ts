import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Buildings } from './buildings.entity';

@Entity('rooms')
export class Rooms {
  @PrimaryGeneratedColumn()
  room_id: number;

  @Column()
  building_id: number;

  @ManyToOne(() => Buildings)
  @JoinColumn({ name: 'building_id' })
  building: Buildings;

  @Column({ type: 'varchar', length: 100 })
  room_name: string;
}
