import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('utility_bills')
export class UtilityBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  service_type: string; // 'AGUA' o 'LUZ'

  @Column({ type: 'varchar', length: 150 })
  company_name: string; // 'PORTOAGUAS EP' o 'CNEL EP'

  @Column({ type: 'varchar', length: 100 })
  invoice_number: string;

  // --- DATOS PÚBLICOS ---
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  phone: string;

  // --- FECHAS ---
  @Column({ type: 'date' })
  issue_date: Date;

  @Column({ type: 'date' })
  due_date: Date;

  // --- DATOS FINANCIEROS (Públicos/Totales) ---
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  third_party_taxes: number; // Para Tasa Portoparques o Contribución Bomberos

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'text' })
  document_url: string;

  @CreateDateColumn()
  created_at: Date;
}