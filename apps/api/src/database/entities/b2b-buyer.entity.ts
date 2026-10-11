import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('b2b_buyers')
export class B2bBuyer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  gstin: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditUsed: number;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  approvedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
