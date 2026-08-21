import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  subject_id: number;

  @Column({ type: 'varchar', length: 150 })
  subject_name: string;
}