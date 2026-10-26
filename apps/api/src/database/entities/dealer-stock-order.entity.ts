import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum StockOrderStatus { PENDING = 'pending', APPROVED = 'approved', SHIPPED = 'shipped', DELIVERED = 'delivered', REJECTED = 'rejected', CANCELLED = 'cancelled' }

@Entity('dealer_stock_orders')
export class DealerStockOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dealerId: string;

  @Column()
  orderNumber: string;

  @Column({ type: 'simple-json' })
  items: { laptopId: string; brand: string; model: string; dealerPrice: number }[];

  @Column({ type: 'int' })
  totalUnits: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'simple-enum', enum: StockOrderStatus, default: StockOrderStatus.PENDING })
  status: StockOrderStatus;

  @Column({ nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  trackingId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
