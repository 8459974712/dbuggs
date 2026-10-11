import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RentalStatus {
  KYC_PENDING = 'kyc_pending',
  KYC_APPROVED = 'kyc_approved',
  DEPOSIT_PENDING = 'deposit_pending',
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  RETURN_REQUESTED = 'return_requested',
  RETURNED = 'returned',
  CLOSED = 'closed',
}

@Entity('rentals')
export class Rental {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  laptopId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyRent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  depositAmount: number;

  @Column({ nullable: true })
  autopayId: string;

  @Column({ nullable: true })
  agreementUrl: string;

  @Column({ type: 'simple-enum', enum: RentalStatus, default: RentalStatus.KYC_PENDING })
  status: RentalStatus;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  nextDueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFee: number;

  @Column({ nullable: true })
  returnDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  depositRefund: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
