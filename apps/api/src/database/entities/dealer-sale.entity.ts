import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('dealer_sales')
export class DealerSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dealerId: string;

  @Column()
  invoiceNumber: string;

  @Column()
  laptopId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  saleAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gstAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
