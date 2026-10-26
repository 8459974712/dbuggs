import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus { NEW = 'new', CONTACTED = 'contacted', INTERESTED = 'interested', CONVERTED = 'converted', LOST = 'lost' }

@Entity('dealer_leads')
export class DealerLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dealerId: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  requirement: string;

  @Column({ nullable: true })
  budget: string;

  @Column({ type: 'simple-enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  followUpDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
