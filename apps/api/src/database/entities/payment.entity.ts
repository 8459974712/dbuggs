import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PaymentStatus { CREATED = 'created', CAPTURED = 'captured', FAILED = 'failed', REFUNDED = 'refunded' }

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityId: string;

  @Column()
  entityType: string;

  @Column({ nullable: true })
  razorpayOrderId: string;

  @Column({ nullable: true })
  razorpayPaymentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ type: 'simple-enum', enum: PaymentStatus, default: PaymentStatus.CREATED })
  status: PaymentStatus;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  refundId: string;

  @CreateDateColumn()
  createdAt: Date;
}
