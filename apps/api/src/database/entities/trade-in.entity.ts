import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TradeInStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  QUOTED = 'quoted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

@Entity('trade_ins')
export class TradeIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tradeNumber: string;

  @Column()
  userId: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ nullable: true })
  processor: string;

  @Column({ nullable: true })
  ram: string;

  @Column({ nullable: true })
  storage: string;

  @Column({ nullable: true })
  displaySize: string;

  @Column({ nullable: true })
  age: string;

  @Column({ nullable: true })
  condition: string;

  @Column({ nullable: true })
  defects: string;

  @Column({ type: 'simple-enum', enum: TradeInStatus, default: TradeInStatus.SUBMITTED })
  status: TradeInStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalValue: number;

  @Column({ nullable: true })
  adminNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
