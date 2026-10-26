import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DealerTier { SILVER = 'silver', GOLD = 'gold', PLATINUM = 'platinum' }
export enum DealerStatus { PENDING = 'pending', ACTIVE = 'active', SUSPENDED = 'suspended', REJECTED = 'rejected' }

@Entity('dealers')
export class Dealer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  gstin: string;

  @Column({ nullable: true })
  gstinVerified: boolean;

  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'simple-json', nullable: true })
  bankDetails: { accountNo: string; ifsc: string; bankName: string; accountHolder: string };

  @Column({ nullable: true })
  bankVerified: boolean;

  @Column({ type: 'simple-json', nullable: true })
  kycDocuments: { panNumber?: string; panUrl?: string; aadhaarUrl?: string; gstCertUrl?: string; cancelledChequeUrl?: string };

  @Column({ nullable: true })
  kycStatus: string;

  @Column({ type: 'simple-enum', enum: DealerTier, default: DealerTier.SILVER })
  tier: DealerTier;

  @Column({ nullable: true })
  territory: string;

  @Column({ type: 'simple-json', nullable: true })
  pincodes: string[];

  @Column({ nullable: true })
  agreementUrl: string;

  @Column({ nullable: true })
  agreementSignedAt: Date;

  @Column({ type: 'simple-enum', enum: DealerStatus, default: DealerStatus.PENDING })
  status: DealerStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditUsed: number;

  @Column({ type: 'int', default: 0 })
  totalSales: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'simple-json', nullable: true })
  staff: { name: string; phone: string; role: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
