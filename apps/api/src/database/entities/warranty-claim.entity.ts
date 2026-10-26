import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ClaimStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

@Entity('warranty_claims')
export class WarrantyClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  claimNumber: string;

  @Column()
  orderId: string;

  @Column()
  userId: string;

  @Column()
  laptopId: string;

  @Column()
  issue: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'simple-enum', enum: ClaimStatus, default: ClaimStatus.OPEN })
  status: ClaimStatus;

  @Column({ nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  resolution: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
