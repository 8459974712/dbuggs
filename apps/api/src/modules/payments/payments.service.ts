import { Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import * as crypto from 'crypto';

function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

@Injectable()
export class PaymentsService {
  private razorpay: any;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private config: ConfigService,
  ) {
    this.keyId = config.get('RAZORPAY_KEY_ID') || '';
    this.keySecret = config.get('RAZORPAY_KEY_SECRET') || '';
    if (this.isOnlineEnabled()) {
      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
    }
  }

  isOnlineEnabled(): boolean {
    const placeholder = /placeholder|your_|xxxx/i;
    return /^rzp_(test|live)_/.test(this.keyId) && !placeholder.test(this.keyId)
      && this.keySecret.length >= 16 && !placeholder.test(this.keySecret);
  }

  getPublicConfig() {
    const onlineEnabled = this.isOnlineEnabled();
    return { onlineEnabled, keyId: onlineEnabled ? this.keyId : null };
  }

  async createOrder(amount: number, entityId: string, entityType: string): Promise<any> {
    if (!this.isOnlineEnabled()) throw new ServiceUnavailableException('Online payment is not configured');
    const paise = Math.round(Number(amount) * 100);
    const rzpOrder = await this.razorpay.orders.create({ amount: paise, currency: 'INR', receipt: `rcpt_${entityId}`.slice(0, 40) });
    const payment = this.paymentRepo.create({
      entityId, entityType, amount,
      razorpayOrderId: rzpOrder.id,
      status: PaymentStatus.CREATED,
    });
    await this.paymentRepo.save(payment);
    return { orderId: rzpOrder.id, amount, amountPaise: paise, currency: 'INR', key: this.keyId };
  }

  findByRazorpayOrder(razorpayOrderId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { razorpayOrderId } });
  }

  async verifyPayment(data: any): Promise<{ success: boolean }> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data || {};
    if (!this.isOnlineEnabled() || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return { success: false };
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (!safeEqualHex(expected, razorpay_signature)) return { success: false };
    await this.paymentRepo.update(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, status: PaymentStatus.CAPTURED },
    );
    return { success: true };
  }

  async handleWebhook(rawBody: Buffer | undefined, body: any, signature: string): Promise<{ ok: true }> {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');
    if (!secret || !rawBody || !signature) throw new UnauthorizedException('Invalid webhook');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqualHex(expected, signature)) throw new UnauthorizedException('Invalid webhook signature');

    if (body?.event === 'payment.captured') {
      const entity = body.payload?.payment?.entity;
      const payment = entity?.order_id ? await this.findByRazorpayOrder(entity.order_id) : null;
      if (payment) {
        await this.paymentRepo.update(payment.id, { razorpayPaymentId: entity.id, status: PaymentStatus.CAPTURED, method: entity.method });
        if (payment.entityType === 'checkout') {
          await this.paymentRepo.manager.query(
            `UPDATE orders SET status = 'confirmed', "updatedAt" = now() WHERE "paymentId" = $1 AND status = 'pending'`,
            [payment.entityId],
          );
        }
      }
    }
    return { ok: true };
  }

  async refund(paymentId: string, amount: number): Promise<any> {
    if (!this.isOnlineEnabled()) throw new ServiceUnavailableException('Online payment is not configured');
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment?.razorpayPaymentId) throw new NotFoundException('Payment not found');
    const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, { amount: Math.round(Number(amount) * 100) });
    await this.paymentRepo.update(paymentId, { status: PaymentStatus.REFUNDED, refundId: refund.id });
    return refund;
  }
}
