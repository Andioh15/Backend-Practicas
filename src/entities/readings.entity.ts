import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sensors } from './sensors.entity';

@Entity('readings')
export class Readings {
  @PrimaryGeneratedColumn()
  reading_id: number;

  @Column()
  sensor_id: number;

  @ManyToOne(() => Sensors)
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensors;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'timestamp' })
  reading_timestamp: Date;
}
