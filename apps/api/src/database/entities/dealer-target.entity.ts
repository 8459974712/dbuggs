import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('dealer_targets')
export class DealerTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  dealerId: string;

  @Column()
  month: string;

  @Column({ type: 'int' })
  targetUnits: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetRevenue: number;

  @Column({ type: 'int', default: 0 })
  achievedUnits: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  achievedRevenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonusAmount: number;

  @Column({ nullable: true })
  schemeName: string;

  @Column({ nullable: true })
  schemeDetails: string;

  @CreateDateColumn()
  createdAt: Date;
}
