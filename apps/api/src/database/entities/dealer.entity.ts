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
  companyName: string;

  @Column({ type: 'simple-json', nullable: true })
  bankDetails: { accountNo: string; ifsc: string; bankName: string };

  @Column({ type: 'simple-enum', enum: DealerTier, default: DealerTier.SILVER })
  tier: DealerTier;

  @Column({ nullable: true })
  territory: string;

  @Column({ nullable: true })
  agreementUrl: string;

  @Column({ type: 'simple-enum', enum: DealerStatus, default: DealerStatus.PENDING })
  status: DealerStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ nullable: true })
  approvedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
