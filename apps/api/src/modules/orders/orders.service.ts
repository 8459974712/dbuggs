import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger,
  NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Order, OrderStatus, OrderType } from '../../database/entities/order.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';
import { B2bService } from '../b2b/b2b.service';
import { PaymentsService } from '../payments/payments.service';
import { DocumentsService } from '../documents/documents.service';
import { GST_RATE } from '../../common/india';
import { CheckoutDto, VerifyCheckoutDto } from './checkout.dto';

const ADMIN_ROLES = ['admin', 'super_admin'];
const gstOf = (amount: number) => amount - Math.round(amount / (1 + GST_RATE));

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    private dataSource: DataSource,
    private b2bService: B2bService,
    private payments: PaymentsService,
    private documents: DocumentsService,
  ) {}

  async create(data: any): Promise<Order> {
    const order = this.orderRepo.create({
      ...data,
      orderNumber: `ORD-${Date.now()}`,
      status: OrderStatus.PENDING,
    });
    await this.laptopRepo.update(data.laptopId, { status: LaptopStatus.RESERVED });
    return this.orderRepo.save(order) as unknown as Promise<Order>;
  }

  private async b2bDiscountPercent(user: any, qty: number): Promise<number> {
    if (user?.role !== 'b2b') return 0;
    const buyer = await this.b2bService.findByUser(user.id);
    if (!buyer?.isApproved) return 0;
    return this.b2bService.getDiscountForQty(qty);
  }

  async checkout(user: any, dto: CheckoutDto) {
    const ids = [...new Set(dto.laptopIds)];
    const method = dto.paymentMethod;
    if (method === 'online' && !this.payments.isOnlineEnabled()) {
      throw new ServiceUnavailableException('Online payment is not available right now. Please choose Cash on Delivery.');
    }
    if (method === 'credit' && user?.role !== 'b2b') {
      throw new ForbiddenException('Credit / PO checkout is available only for approved B2B buyers.');
    }
    const discountPct = await this.b2bDiscountPercent(user, ids.length);
    const ref = `CHK-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const poNumber = dto.poNumber?.trim();
    const paymentId = method === 'online' ? ref : method === 'cod' ? `COD:${ref}` : `CREDIT:${ref}:${poNumber}`;

    const orders = await this.dataSource.transaction(async (m) => {
      const laptops = await m.getRepository(Laptop)
        .createQueryBuilder('l')
        .setLock('pessimistic_write')
        .where('l.id IN (:...ids)', { ids })
        .getMany();
      if (laptops.length !== ids.length) {
        const found = new Set(laptops.map(l => l.id));
        throw new ConflictException({
          message: 'Some items in your cart are no longer listed.',
          unavailableIds: ids.filter(id => !found.has(id)),
        });
      }
      const unavailable = laptops.filter(l => l.status !== LaptopStatus.AVAILABLE || !(Number(l.sellingPrice) > 0));
      if (unavailable.length) {
        throw new ConflictException({
          message: `${unavailable.map(l => `${l.brand} ${l.model}`).join(', ')} is no longer available.`,
          unavailableIds: unavailable.map(l => l.id),
        });
      }
      const type = discountPct > 0 || method === 'credit' ? OrderType.B2B : OrderType.B2C;
      const stamp = Date.now();
      const rows = laptops.map((l, i) => {
        const amount = Math.round(Number(l.sellingPrice) * (1 - discountPct / 100));
        return m.getRepository(Order).create({
          orderNumber: `ORD-${stamp}-${i + 1}`,
          userId: user.id,
          laptopId: l.id,
          type,
          status: method === 'online' ? OrderStatus.PENDING : OrderStatus.CONFIRMED,
          amount,
          gstAmount: gstOf(amount),
          shippingAddress: dto.shippingAddress.trim(),
          paymentId,
        });
      });
      if (method === 'credit') {
        const total = rows.reduce((s, o) => s + Number(o.amount), 0);
        const gst = rows.reduce((s, o) => s + Number(o.gstAmount), 0);
        await this.b2bService.chargeCredit(m, user.id, total, gst, ref, poNumber);
      }
      await m.getRepository(Laptop).update({ id: In(ids) }, { status: LaptopStatus.RESERVED });
      return m.getRepository(Order).save(rows);
    });

    if (method !== 'online') {
      for (const o of orders) await this.documents.tryEnsureInvoice(o.id);
    }
    const total = orders.reduce((s, o) => s + Number(o.amount), 0);
    const result: any = {
      checkoutRef: ref,
      paymentMethod: method,
      poNumber: poNumber || null,
      discountPercent: discountPct,
      total,
      gstTotal: orders.reduce((s, o) => s + Number(o.gstAmount), 0),
      orders: orders.map(o => ({ id: o.id, orderNumber: o.orderNumber, laptopId: o.laptopId, amount: Number(o.amount), status: o.status })),
    };
    if (method !== 'online') return result;

    try {
      result.razorpay = await this.payments.createOrder(total, ref, 'checkout');
      return result;
    } catch (e) {
      this.logger.error(`Razorpay order failed for ${ref}: ${e?.message || e}`);
      await this.cancelCheckout(user.id, ref);
      throw new ServiceUnavailableException('Could not start online payment. Please try again or choose Cash on Delivery.');
    }
  }

  async verifyCheckout(userId: string, dto: VerifyCheckoutDto) {
    const payment = await this.payments.findByRazorpayOrder(dto.razorpay_order_id);
    if (!payment || payment.entityType !== 'checkout') throw new NotFoundException('Payment not found');
    const orders = await this.orderRepo.find({ where: { paymentId: payment.entityId, userId } });
    if (!orders.length) throw new NotFoundException('Payment not found');
    const { success } = await this.payments.verifyPayment(dto);
    if (!success) throw new BadRequestException('Payment verification failed');
    await this.orderRepo.update({ paymentId: payment.entityId, userId, status: OrderStatus.PENDING }, { status: OrderStatus.CONFIRMED });
    for (const o of orders) await this.documents.tryEnsureInvoice(o.id);
    return { success: true, checkoutRef: payment.entityId, orders: orders.map(o => ({ id: o.id, orderNumber: o.orderNumber })) };
  }

  async cancelCheckout(userId: string, ref: string) {
    const pending = await this.orderRepo.find({ where: { paymentId: ref, userId, status: OrderStatus.PENDING } });
    if (!pending.length) return { cancelled: 0 };
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(Order).update({ id: In(pending.map(o => o.id)) }, { status: OrderStatus.CANCELLED });
      await m.getRepository(Laptop).update(
        { id: In(pending.map(o => o.laptopId)), status: LaptopStatus.RESERVED },
        { status: LaptopStatus.AVAILABLE },
      );
    });
    return { cancelled: pending.length };
  }

  async findByUser(userId: string, query: any): Promise<Order[]> {
    return this.orderRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAll(query: any): Promise<{ data: Order[]; total: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    const [data, total] = await this.orderRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findOneFor(user: any, id: string): Promise<Order> {
    const order = await this.findOne(id);
    if (order.userId !== user.id && !ADMIN_ROLES.includes(user.role)) throw new ForbiddenException();
    return order;
  }

  private async releaseOrder(m: EntityManager, order: Order, laptopStatus: LaptopStatus, actorId: string, why: string) {
    await m.getRepository(Laptop).update(
      { id: order.laptopId, status: In([LaptopStatus.RESERVED, LaptopStatus.SOLD]) },
      { status: laptopStatus },
    );
    if ((order.paymentId || '').startsWith('CREDIT:')) {
      await this.b2bService.reverseCredit(
        m, order.userId, Number(order.amount), Number(order.gstAmount || 0), order.orderNumber,
        `${why} — order ${order.orderNumber}`, actorId,
      );
    }
  }

  async updateStatus(id: string, status: string, actorId?: string): Promise<Order> {
    const next = status as OrderStatus;
    if (!Object.values(OrderStatus).includes(next)) throw new BadRequestException('Unknown order status');
    const order = await this.findOne(id);
    if (order.status === next) return order;
    if ([OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(order.status)) {
      throw new BadRequestException(`This order is already ${order.status} and cannot be changed.`);
    }
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(Order).update(id, { status: next });
      if (next === OrderStatus.DELIVERED) {
        await m.getRepository(Laptop).update({ id: order.laptopId, status: LaptopStatus.RESERVED }, { status: LaptopStatus.SOLD });
      }
      if (next === OrderStatus.CANCELLED) await this.releaseOrder(m, order, LaptopStatus.AVAILABLE, actorId, 'Order cancelled');
      if (next === OrderStatus.RETURNED) await this.releaseOrder(m, order, LaptopStatus.IN_QC, actorId, 'Order returned');
    });
    if ([OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(next)) await this.documents.tryEnsureCreditNote(id);
    else if (next !== OrderStatus.PENDING) await this.documents.tryEnsureInvoice(id);
    return this.findOne(id);
  }

  async cancelByCustomer(user: any, id: string): Promise<Order> {
    const order = await this.findOneFor(user, id);
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException('This order can no longer be cancelled.');
    }
    const p = order.paymentId || '';
    const unpaid = order.status === OrderStatus.PENDING || p.startsWith('COD:') || p.startsWith('CREDIT:');
    if (!unpaid) {
      throw new BadRequestException('Paid orders are cancelled by our support team so your refund can be processed. Please contact support.');
    }
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
      await this.releaseOrder(m, order, LaptopStatus.AVAILABLE, user.id, 'Cancelled by customer');
    });
    await this.documents.tryEnsureCreditNote(id);
    return this.findOne(id);
  }

  async requestReturn(user: any, id: string, reason: string): Promise<Order> {
    const order = await this.findOneFor(user, id);
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('Only delivered orders can be returned.');
    await this.orderRepo.update(id, { status: OrderStatus.RETURN_REQUESTED });
    return this.findOne(id);
  }

  async raiseWarranty(user: any, id: string, data: any): Promise<{ message: string }> {
    await this.findOneFor(user, id);
    // TODO: Create warranty ticket
    return { message: 'Warranty claim submitted successfully' };
  }
}
