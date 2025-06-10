import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn()
  sensor_id: number;

  @Column()
  room_id: number;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

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
