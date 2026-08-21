import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('professors')
export class Professor {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  professor_id: string;

  @Column({ type: 'varchar', length: 150 })
  professor_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  professor_number: string;
}