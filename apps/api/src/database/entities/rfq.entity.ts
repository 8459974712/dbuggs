import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type RfqStatus = 'open' | 'quoted' | 'accepted' | 'declined' | 'expired';

export interface QuoteItem {
  description: string;
  qty: number;
  unitPrice: number;
}

@Entity('rfqs')
export class Rfq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  rfqNumber: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  buyerId: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ type: 'text' })
  details: string;

  @Column({ default: 'open' })
  status: RfqStatus;

  @Column({ type: 'simple-json', nullable: true })
  quoteItems: QuoteItem[];

  @Column({ nullable: true })
  quotationNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  gstAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  total: number;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  quotedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  quotedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
