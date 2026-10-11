import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role: string;

  @Column()
  page: string;

  @Column({ default: true })
  canView: boolean;

  @Column({ default: false })
  canCreate: boolean;

  @Column({ default: false })
  canEdit: boolean;

  @Column({ default: false })
  canDelete: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
