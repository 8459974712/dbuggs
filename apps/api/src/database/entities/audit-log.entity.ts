import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @Column()
  action: string;

  @Column()
  entity: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'simple-json', nullable: true })
  before: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  after: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
