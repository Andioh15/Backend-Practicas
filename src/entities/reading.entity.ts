import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('reading')
export class Reading {
  @PrimaryGeneratedColumn()
  reading_id: number;

  @Column()
  sensor_id: number;

  @ManyToOne(() => Sensor)
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'timestamp' })
  reading_timestamp: Date;
}
