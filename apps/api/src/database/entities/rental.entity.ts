import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RentalStatus {
  MOBILE_VERIFIED = 'mobile_verified',
  PAN_VERIFIED = 'pan_verified',
  KYC_PENDING = 'kyc_pending',
  KYC_APPROVED = 'kyc_approved',
  CREDIT_CHECK = 'credit_check',
  MANUAL_REVIEW = 'manual_review',
  REJECTED = 'rejected',
  APPROVED = 'approved',
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

  @Column({ type: 'integer', default: 6 })
  tenure: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  panNumber: string;

  @Column({ type: 'boolean', default: false })
  mobileVerified: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyIncome: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employmentType: string;

  @Column({ type: 'integer', nullable: true })
  creditScore: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  creditStatus: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalPayable: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  processingFee: number;

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

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  emiSchedule: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
