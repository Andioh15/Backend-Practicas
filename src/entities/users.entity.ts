import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';   

@Entity('users')
export class Users {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    firstName: string;

    @Column({ type: 'varchar', length: 100 })
    lastName: string;

    @Column({ type: 'varchar', length: 100 })
    cedula: string;

   
}