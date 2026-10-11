import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum CommissionStatus { PENDING = 'pending', APPROVED = 'approved', PAID = 'paid', CANCELLED = 'cancelled' }

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dealerId: string;

  @Column()
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  saleAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tdsAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netAmount: number;

  @Column({ type: 'simple-enum', enum: CommissionStatus, default: CommissionStatus.PENDING })
  status: CommissionStatus;

  @Column({ nullable: true })
  payoutId: string;

  @CreateDateColumn()
  createdAt: Date;
}
