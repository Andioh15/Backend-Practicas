import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Rooms } from './rooms.entity'; // Asegúrate de que el nombre coincida con tu entidad existente
import { Subject } from './subjects.entity';
import { Professor } from './professors.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  schedule_id: number;

  @Column()
  room_id: number;

  @Column()
  subject_id: number;

  @Column({ type: 'varchar', length: 50 })
  professor_id: string;

  @Column({ type: 'int' })
  day_of_week: number;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  // Relaciones para que al hacer GET te traiga los nombres reales y no solo los IDs
  @ManyToOne(() => Rooms)
  @JoinColumn({ name: 'room_id' })
  room: Rooms;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @ManyToOne(() => Professor)
  @JoinColumn({ name: 'professor_id' })
  professor: Professor;
}