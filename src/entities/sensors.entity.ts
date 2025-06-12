import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Rooms } from './rooms.entity';

@Entity('Sensors')
export class Sensors {
  @PrimaryGeneratedColumn()
  sensor_id: number;

  @Column()
  room_id: number;

  @ManyToOne(() => Rooms)
  @JoinColumn({ name: 'room_id' })
  room: Rooms;

  @Column({ type: 'varchar', length: 100 })
  sensor_type: string;

  @Column({ type: 'varchar', length: 50 })
  sensor_measurement_unit: string;

  @Column({ type: 'date' })
  sensor_installation_date: Date;

  @Column({ type: 'varchar', length: 100 })
  sensor_manufacturer: string;

  @Column({ type: 'varchar', length: 100 })
  sensor_serial_number: string;
}
