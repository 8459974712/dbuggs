import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: any;

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private config: ConfigService,
  ) {
    const keyId = config.get('RAZORPAY_KEY_ID') || 'rzp_test_placeholder';
    const keySecret = config.get('RAZORPAY_KEY_SECRET') || 'placeholder_secret';
    const Razorpay = require('razorpay');
    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(amount: number, entityId: string, entityType: string): Promise<any> {
    const options = { amount: amount * 100, currency: 'INR', receipt: `rcpt_${entityId}` };
    const rzpOrder = await this.razorpay.orders.create(options);
    const payment = this.paymentRepo.create({
      entityId, entityType, amount,
      razorpayOrderId: rzpOrder.id,
      status: PaymentStatus.CREATED,
    });
    await this.paymentRepo.save(payment);
    return { orderId: rzpOrder.id, amount, currency: 'INR', key: this.config.get('razorpay.keyId') };
  }

  async verifyPayment(data: any): Promise<{ success: boolean }> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get('RAZORPAY_KEY_SECRET') || 'placeholder_secret')
      .update(body)
      .digest('hex');
    if (expectedSignature !== razorpay_signature) return { success: false };
    await this.paymentRepo.update(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, status: PaymentStatus.CAPTURED },
    );
    return { success: true };
  }

  async handleWebhook(body: any, signature: string): Promise<void> {
    // Validate webhook signature and process events
    const event = body.event;
    if (event === 'payment.captured') {
      await this.paymentRepo.update(
        { razorpayOrderId: body.payload.payment.entity.order_id },
        { status: PaymentStatus.CAPTURED },
      );
    }
  }

  async refund(paymentId: string, amount: number): Promise<any> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, { amount: amount * 100 });
    await this.paymentRepo.update(paymentId, { status: PaymentStatus.REFUNDED, refundId: refund.id });
    return refund;
  }
}
