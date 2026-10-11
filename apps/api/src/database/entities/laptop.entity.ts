import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LaptopGrade { AP = 'A+', A = 'A', B = 'B', C = 'C' }
export enum LaptopStatus {
  IN_QC = 'in_qc',
  AVAILABLE = 'available',
  RENTED = 'rented',
  SOLD = 'sold',
  REPAIR = 'repair',
  RESERVED = 'reserved',
}

@Entity('laptops')
export class Laptop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  serialNo: string;

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
  display: string;

  @Column({ type: 'simple-enum', enum: LaptopGrade, nullable: true })
  grade: LaptopGrade;

  @Column({ type: 'simple-enum', enum: LaptopStatus, default: LaptopStatus.IN_QC })
  status: LaptopStatus;

  @Column({ nullable: true })
  warehouseId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellingPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rentalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  dealerPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  wholesalePrice: number;

  @Column({ nullable: true })
  warrantyMonths: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
