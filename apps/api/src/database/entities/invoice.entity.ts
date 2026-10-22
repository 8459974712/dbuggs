import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

export type InvoiceKind = 'invoice' | 'credit_note';

@Entity('invoices')
@Unique(['orderId', 'kind'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  number: string;

  @Column({ default: 'invoice' })
  kind: InvoiceKind;

  @Index()
  @Column()
  orderId: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  originalInvoiceNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  taxable: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cgst: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  sgst: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  igst: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ nullable: true })
  placeOfSupplyCode: string;

  @Column({ nullable: true })
  buyerGstin: string;

  @Column({ nullable: true })
  buyerName: string;

  @Column({ type: 'text', nullable: true })
  buyerAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
