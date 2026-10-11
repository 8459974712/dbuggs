import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('laptop_qc')
export class LaptopQc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  laptopId: string;

  @Column()
  technicianId: string;

  @Column({ type: 'simple-json', nullable: true })
  checklist: Record<string, boolean>;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  batteryPercent: number;

  @Column({ type: 'text', array: true, nullable: true })
  photos: string[];

  @Column({ nullable: true })
  reportPdfUrl: string;

  @Column({ nullable: true })
  partsReplaced: string;

  @Column({ nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  gradedAs: string;

  @CreateDateColumn()
  createdAt: Date;
}
