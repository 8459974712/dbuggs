import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger,
  NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Order, OrderStatus, OrderType } from '../../database/entities/order.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';
import { WarrantyClaim, ClaimStatus } from '../../database/entities/warranty-claim.entity';
import { TradeIn, TradeInStatus } from '../../database/entities/trade-in.entity';
import { WalletTransaction, WalletTxnType } from '../../database/entities/wallet.entity';
import { B2bService } from '../b2b/b2b.service';
import { PaymentsService } from '../payments/payments.service';
import { DocumentsService } from '../documents/documents.service';
import { GST_RATE } from '../../common/india';
import { CheckoutDto, VerifyCheckoutDto } from './checkout.dto';

const ADMIN_ROLES = ['admin', 'super_admin'];
const gstOf = (amount: number) => amount - Math.round(amount / (1 + GST_RATE));
const RETURN_WINDOW_DAYS = 7;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    @InjectRepository(WarrantyClaim) private claimRepo: Repository<WarrantyClaim>,
    @InjectRepository(TradeIn) private tradeRepo: Repository<TradeIn>,
    @InjectRepository(WalletTransaction) private walletRepo: Repository<WalletTransaction>,
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
      if (next === OrderStatus.RETURNED) {
        await this.releaseOrder(m, order, LaptopStatus.IN_QC, actorId, 'Order returned');
        await this.creditWallet(m, order.userId, Number(order.amount), `Refund for ${order.orderNumber}`, `RETURN:${order.id}`);
      }
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

  // ── #26 RETURNS ──
  async requestReturn(user: any, id: string, reason: string): Promise<Order> {
    const order = await this.findOneFor(user, id);
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('Only delivered orders can be returned.');
    const deliveredAt = order.updatedAt;
    const daysSince = Math.floor((Date.now() - new Date(deliveredAt).getTime()) / 86400000);
    if (daysSince > RETURN_WINDOW_DAYS) {
      throw new BadRequestException(`Return window of ${RETURN_WINDOW_DAYS} days has expired. Please raise a warranty claim instead.`);
    }
    await this.orderRepo.update(id, { status: OrderStatus.RETURN_REQUESTED });
    return this.findOne(id);
  }

  async approveReturn(id: string, actorId: string): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.RETURN_REQUESTED) throw new BadRequestException('This order does not have a pending return request.');
    return this.updateStatus(id, OrderStatus.RETURNED, actorId);
  }

  // ── #27 WARRANTY CLAIMS ──
  async raiseWarranty(user: any, orderId: string, data: { issue: string; description?: string }): Promise<WarrantyClaim> {
    const order = await this.findOneFor(user, orderId);
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('Warranty claims can only be raised on delivered orders.');
    const laptop = await this.laptopRepo.findOne({ where: { id: order.laptopId } });
    const warrantyMonths = laptop?.warrantyMonths || 6;
    const deliveredAt = new Date(order.updatedAt);
    const expiresAt = new Date(deliveredAt);
    expiresAt.setMonth(expiresAt.getMonth() + warrantyMonths);
    if (new Date() > expiresAt) throw new BadRequestException(`Warranty expired on ${expiresAt.toLocaleDateString('en-IN')}.`);

    const claim = this.claimRepo.create({
      claimNumber: `WC-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`,
      orderId,
      userId: user.id,
      laptopId: order.laptopId,
      issue: data.issue.trim(),
      description: data.description?.trim() || null,
      status: ClaimStatus.OPEN,
    });
    return this.claimRepo.save(claim);
  }

  async findWarrantyByUser(userId: string): Promise<WarrantyClaim[]> {
    return this.claimRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAllWarranty(query: any): Promise<{ data: WarrantyClaim[]; total: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    const [data, total] = await this.claimRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async updateWarranty(id: string, data: { status?: string; adminNotes?: string; resolution?: string }): Promise<WarrantyClaim> {
    const claim = await this.claimRepo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Warranty claim not found');
    if (data.status) claim.status = data.status as ClaimStatus;
    if (data.adminNotes !== undefined) claim.adminNotes = data.adminNotes;
    if (data.resolution !== undefined) claim.resolution = data.resolution;
    return this.claimRepo.save(claim);
  }

  // ── #28 TRADE-IN ──
  async submitTradeIn(user: any, data: any): Promise<TradeIn> {
    const estimate = this.estimateTradeValue(data);
    const tradeIn = this.tradeRepo.create({
      tradeNumber: `TI-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`,
      userId: user.id,
      brand: data.brand,
      model: data.model,
      processor: data.processor || null,
      ram: data.ram || null,
      storage: data.storage || null,
      displaySize: data.displaySize || null,
      age: data.age || null,
      condition: data.condition,
      defects: data.defects || null,
      estimatedValue: estimate,
      status: TradeInStatus.SUBMITTED,
    });
    return this.tradeRepo.save(tradeIn);
  }

  private estimateTradeValue(data: any): number {
    let base = 8000;
    const brand = (data.brand || '').toLowerCase();
    if (['apple', 'macbook'].some(b => brand.includes(b))) base = 20000;
    else if (['dell', 'hp', 'lenovo', 'thinkpad'].some(b => brand.includes(b))) base = 12000;
    else if (['asus', 'acer'].some(b => brand.includes(b))) base = 10000;

    const ram = parseInt(data.ram) || 4;
    if (ram >= 16) base *= 1.4;
    else if (ram >= 8) base *= 1.15;

    const cond = (data.condition || '').toLowerCase();
    if (cond === 'excellent') base *= 1.0;
    else if (cond === 'good') base *= 0.75;
    else if (cond === 'fair') base *= 0.5;
    else base *= 0.3;

    const age = (data.age || '').toLowerCase();
    if (age.includes('5') || age.includes('old')) base *= 0.5;
    else if (age.includes('3') || age.includes('4')) base *= 0.7;

    return Math.round(base / 100) * 100;
  }

  async findTradeInsByUser(userId: string): Promise<TradeIn[]> {
    return this.tradeRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAllTradeIns(query: any): Promise<{ data: TradeIn[]; total: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    const [data, total] = await this.tradeRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async updateTradeIn(id: string, data: { status?: string; finalValue?: number; adminNotes?: string }, actorId: string): Promise<TradeIn> {
    const ti = await this.tradeRepo.findOne({ where: { id } });
    if (!ti) throw new NotFoundException('Trade-in request not found');
    if (data.status) ti.status = data.status as TradeInStatus;
    if (data.finalValue !== undefined) ti.finalValue = data.finalValue;
    if (data.adminNotes !== undefined) ti.adminNotes = data.adminNotes;
    const saved = await this.tradeRepo.save(ti);
    if (saved.status === TradeInStatus.COMPLETED && saved.finalValue > 0) {
      await this.dataSource.transaction(async (m) => {
        await this.creditWallet(m, ti.userId, Number(saved.finalValue), `Trade-in ${saved.tradeNumber}`, `TRADE:${saved.id}`);
      });
    }
    return saved;
  }

  // ── #30 CUSTOMER WALLET ──
  private async creditWallet(m: EntityManager, userId: string, amount: number, note: string, reference: string) {
    const repo = m.getRepository(WalletTransaction);
    const last = await repo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    const prevBal = last ? Number(last.balanceAfter) : 0;
    await repo.save(repo.create({
      userId,
      type: WalletTxnType.CREDIT,
      amount,
      balanceAfter: prevBal + amount,
      reference,
      note,
    }));
  }

  async getWalletBalance(userId: string): Promise<{ balance: number; transactions: WalletTransaction[] }> {
    const txns = await this.walletRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const balance = txns.length ? Number(txns[0].balanceAfter) : 0;
    return { balance, transactions: txns };
  }

  async adminCreditWallet(userId: string, amount: number, note: string, actorId: string): Promise<WalletTransaction> {
    let txn: WalletTransaction;
    await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(WalletTransaction);
      const last = await repo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
      const prevBal = last ? Number(last.balanceAfter) : 0;
      txn = await repo.save(repo.create({
        userId,
        type: amount >= 0 ? WalletTxnType.CREDIT : WalletTxnType.DEBIT,
        amount: Math.abs(amount),
        balanceAfter: prevBal + amount,
        reference: `ADMIN:${actorId}`,
        note,
      }));
    });
    return txn;
  }
}
