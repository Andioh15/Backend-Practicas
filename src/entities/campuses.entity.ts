import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('campuses')
export class Campus {
  @PrimaryGeneratedColumn()
  campus_id: number;

  @Column({ type: 'varchar', length: 100 })
  campus_name: string;
}
