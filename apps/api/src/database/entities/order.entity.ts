import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum OrderType { B2C = 'b2c', B2B = 'b2b', RENTAL = 'rental', DEALER = 'dealer' }
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURN_REQUESTED = 'return_requested',
  RETURNED = 'returned',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderNumber: string;

  @Column()
  userId: string;

  @Column()
  laptopId: string;

  @Column({ type: 'simple-enum', enum: OrderType })
  type: OrderType;

  @Column({ type: 'simple-enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  gstAmount: number;

  @Column({ nullable: true })
  gstInvoiceUrl: string;

  @Column({ nullable: true })
  shipmentId: string;

  @Column({ nullable: true })
  trackingId: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  paymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
