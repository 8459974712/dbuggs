import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum KycDocType {
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  PASSPORT = 'passport',
  DL = 'driving_license',
  GSTIN = 'gstin',
  UTILITY_BILL = 'utility_bill',
}

export enum KycDocStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('kyc_documents')
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'simple-enum', enum: KycDocType })
  type: KycDocType;

  @Column()
  docUrlEncrypted: string;

  @Column({ nullable: true })
  selfieUrl: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  faceMatchScore: number;

  @Column({ nullable: true })
  maskedId: string;

  @Column({ type: 'simple-enum', enum: KycDocStatus, default: KycDocStatus.PENDING })
  status: KycDocStatus;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
