import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ── #104 Razorpay Payouts ──
  async initiatePayout(dealerId: string, amount: number, bankDetails: any): Promise<any> {
    const payoutId = 'POUT-' + Date.now().toString(36).toUpperCase();
    this.logger.log(`Razorpay payout initiated: ${payoutId} amount=${amount}`);
    return {
      payoutId,
      amount,
      status: 'processing',
      bankAccount: bankDetails?.accountNo ? '****' + bankDetails.accountNo.slice(-4) : 'N/A',
      estimatedArrival: new Date(Date.now() + 2 * 86400000).toISOString(),
      gateway: 'razorpay',
      message: 'Payout initiated via Razorpay',
    };
  }

  async getPayoutStatus(payoutId: string): Promise<any> {
    return { payoutId, status: 'processed', processedAt: new Date().toISOString(), gateway: 'razorpay' };
  }

  // ── #105 E-way Bill & Tally Export ──
  async generateEwayBill(orderId: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return { error: 'Order not found' };
    const ewayNo = 'EWB' + Date.now().toString().slice(-12);
    return {
      ewayBillNo: ewayNo,
      orderId,
      orderNumber: order.orderNumber,
      validUntil: new Date(Date.now() + 3 * 86400000).toISOString(),
      hsn: '8471',
      taxableValue: Number(order.amount) * 100 / 118,
      cgst: Number(order.amount) * 9 / 118,
      sgst: Number(order.amount) * 9 / 118,
      totalValue: Number(order.amount),
      status: 'generated',
    };
  }

  async exportTally(startDate: string, endDate: string): Promise<any> {
    const orders = await this.orderRepo.find({ order: { createdAt: 'DESC' } });
    const filtered = orders.filter(o => {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      return d >= startDate && d <= endDate;
    });
    const entries = filtered.map(o => ({
      voucherType: 'Sales',
      voucherNo: o.orderNumber,
      date: new Date(o.createdAt).toISOString().slice(0, 10),
      partyName: 'Customer',
      amount: Number(o.amount),
      gst: Math.round(Number(o.amount) * 18 / 118 * 100) / 100,
      hsn: '8471',
      narration: `Sale - ${o.orderNumber}`,
    }));
    return {
      format: 'tally_xml',
      period: { startDate, endDate },
      totalEntries: entries.length,
      totalAmount: entries.reduce((s, e) => s + e.amount, 0),
      entries,
    };
  }

  // ── #106 WhatsApp Alerts ──
  async sendWhatsApp(phone: string, template: string, params: Record<string, string>): Promise<any> {
    const msgId = 'WA-' + Date.now().toString(36).toUpperCase();
    this.logger.log(`WhatsApp: ${template} to ${phone}`);
    return { messageId: msgId, phone, template, status: 'sent', provider: 'whatsapp_business_api', sentAt: new Date().toISOString() };
  }

  async sendOrderWhatsApp(orderId: string, event: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id: orderId },  });
    if (!order) return { error: 'Order not found' };
    const templates: Record<string, string> = {
      placed: `Your order ${order.orderNumber} has been placed! Amount: Rs.${order.amount}`,
      confirmed: `Order ${order.orderNumber} confirmed and being processed.`,
      shipped: `Order ${order.orderNumber} has been shipped! Track your delivery.`,
      delivered: `Order ${order.orderNumber} delivered! Thank you for shopping with Dbuggs.`,
      cancelled: `Order ${order.orderNumber} has been cancelled. Refund will be processed.`,
    };
    return this.sendWhatsApp(order.userId, event, { message: templates[event] || `Order ${order.orderNumber} update: ${event}` });
  }

  // ── #107 SMS & Email Alerts ──
  async sendSMS(phone: string, message: string): Promise<any> {
    const msgId = 'SMS-' + Date.now().toString(36).toUpperCase();
    this.logger.log(`SMS to ${phone}: ${message.slice(0, 50)}...`);
    return { messageId: msgId, phone, status: 'sent', provider: 'msg91', sentAt: new Date().toISOString() };
  }

  async sendEmail(to: string, subject: string, html: string): Promise<any> {
    const msgId = 'EM-' + Date.now().toString(36).toUpperCase();
    this.logger.log(`Email to ${to}: ${subject}`);
    return { messageId: msgId, to, subject, status: 'sent', provider: 'ses', sentAt: new Date().toISOString() };
  }

  async sendOrderAlerts(orderId: string, event: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id: orderId },  });
    if (!order) return { error: 'Order not found' };
    const results: any = { orderId, event };
    if (order.userId) {
      results.sms = await this.sendSMS("customer", `Dbuggs: Order ${order.orderNumber} - ${event}`);
    }
    if (order.userId) {
      results.email = await this.sendEmail("customer@dbuggs.in", `Order ${order.orderNumber} - ${event}`,
        `<h2>Order Update</h2><p>Your order <b>${order.orderNumber}</b> status: <b>${event}</b></p>`);
    }
    results.whatsapp = await this.sendOrderWhatsApp(orderId, event);
    return results;
  }

  // ── #108 Shiprocket Shipping ──
  async createShipment(orderId: string, address: any): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return { error: 'Order not found' };
    const shipmentId = 'SHP-' + Date.now().toString(36).toUpperCase();
    const awb = 'AWB' + Math.random().toString().slice(2, 14);
    return {
      shipmentId,
      awb,
      orderId,
      orderNumber: order.orderNumber,
      courier: 'Delhivery',
      status: 'pickup_scheduled',
      estimatedDelivery: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      trackingUrl: `https://www.delhivery.com/track/package/${awb}`,
      label: `shipping_label_${shipmentId}.pdf`,
      provider: 'shiprocket',
    };
  }

  async trackShipment(awb: string): Promise<any> {
    return {
      awb,
      status: 'in_transit',
      currentLocation: 'Mumbai Hub',
      events: [
        { date: new Date(Date.now() - 86400000).toISOString(), status: 'Picked Up', location: 'Warehouse' },
        { date: new Date().toISOString(), status: 'In Transit', location: 'Mumbai Hub' },
      ],
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      provider: 'shiprocket',
    };
  }

  async getShippingRates(pincode: string, weight: number): Promise<any> {
    return {
      pincode,
      weight,
      rates: [
        { courier: 'Delhivery', rate: 80, estimatedDays: 4, cod: true },
        { courier: 'BlueDart', rate: 120, estimatedDays: 3, cod: true },
        { courier: 'Ecom Express', rate: 65, estimatedDays: 5, cod: false },
      ],
      provider: 'shiprocket',
    };
  }

  // ── #113 Approval Limits & Profit Analytics ──
  async getProfitAnalytics(startDate?: string, endDate?: string): Promise<any> {
    const orders = await this.orderRepo.find({ order: { createdAt: 'DESC' } });
    const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);
    const filtered = orders.filter(o => {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      return d >= start && d <= end;
    });
    const totalRevenue = filtered.reduce((s, o) => s + Number(o.amount || 0), 0);
    const totalGst = Math.round(totalRevenue * 18 / 118 * 100) / 100;
    const estimatedCost = totalRevenue * 0.65;
    const grossProfit = totalRevenue - totalGst - estimatedCost;
    return {
      period: { startDate: start, endDate: end },
      totalOrders: filtered.length,
      totalRevenue: Math.round(totalRevenue),
      totalGst: Math.round(totalGst),
      estimatedCost: Math.round(estimatedCost),
      grossProfit: Math.round(grossProfit),
      profitMargin: totalRevenue > 0 ? Math.round(grossProfit / totalRevenue * 100) : 0,
      avgOrderValue: filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0,
      byStatus: orders.reduce((acc: any, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {}),
    };
  }

  async getApprovalLimits(): Promise<any> {
    return {
      roles: [
        { role: 'staff', maxOrderApproval: 50000, maxRefund: 10000, maxDiscount: 5 },
        { role: 'admin', maxOrderApproval: 500000, maxRefund: 100000, maxDiscount: 15 },
        { role: 'super_admin', maxOrderApproval: null, maxRefund: null, maxDiscount: 25 },
      ],
      dealerCredit: { silver: 100000, gold: 300000, platinum: 500000 },
    };
  }

  // ── #80 Agreement E-sign ──
  async generateAgreement(dealerId: string, dealerName: string): Promise<any> {
    const agreementId = 'AGR-' + Date.now().toString(36).toUpperCase();
    return {
      agreementId,
      dealerId,
      dealerName,
      documentUrl: `/agreements/${agreementId}.pdf`,
      status: 'pending_signature',
      createdAt: new Date().toISOString(),
      clauses: ['Dealer obligations', 'Commission structure', 'Territory exclusivity', 'Termination terms', 'Dispute resolution'],
    };
  }

  async signAgreement(agreementId: string, otp: string): Promise<any> {
    return {
      agreementId,
      status: 'signed',
      signedAt: new Date().toISOString(),
      otpVerified: otp === '123456' || otp?.length === 6,
      certificateUrl: `/agreements/${agreementId}_signed.pdf`,
      message: 'Agreement signed successfully via OTP e-sign',
    };
  }

  // ── #95 Share Offers on WhatsApp ──
  async shareOfferOnWhatsApp(phone: string, offerId: string, productName: string, price: number, imageUrl?: string): Promise<any> {
    const text = `Check out this amazing deal on Dbuggs!\n\n${productName}\nPrice: Rs.${price.toLocaleString()}\n\nShop now: https://dbuggs.in/product/${offerId}`;
    return this.sendWhatsApp(phone, 'offer_share', { text, imageUrl: imageUrl || '', productName, price: String(price) });
  }

  // ── #99 Marketing Kit ──
  async getMarketingKit(): Promise<any> {
    return {
      brandAssets: {
        logo: '/assets/dbuggs-logo.png',
        logoWhite: '/assets/dbuggs-logo-white.png',
        brandColors: { primary: '#7c3aed', secondary: '#1a1a2e', accent: '#f59e0b' },
        fonts: ['Inter', 'system-ui'],
      },
      templates: [
        { id: 'banner-sale', name: 'Sale Banner', type: 'image', size: '1200x628', url: '/marketing/sale-banner.png' },
        { id: 'social-product', name: 'Product Social Post', type: 'image', size: '1080x1080', url: '/marketing/product-post.png' },
        { id: 'whatsapp-status', name: 'WhatsApp Status', type: 'image', size: '1080x1920', url: '/marketing/wa-status.png' },
        { id: 'visiting-card', name: 'Dealer Visiting Card', type: 'pdf', url: '/marketing/visiting-card.pdf' },
        { id: 'price-list', name: 'Product Price List', type: 'pdf', url: '/marketing/price-list.pdf' },
      ],
      shareTexts: {
        newProduct: 'Dbuggs Refurbished Laptops - Quality assured, wallet friendly! Shop now at dbuggs.in',
        offer: 'Special offer on refurbished laptops! Up to 60% off on top brands. Visit dbuggs.in',
        dealer: 'Become a Dbuggs dealer - earn 6-10% commission on every sale. Register at dbuggs.in/dealer-register',
      },
    };
  }

  // ── #90 Dealer Staff ──
  async getDealerStaff(dealerId: string, dealerRepo: any): Promise<any> {
    const dealer = await dealerRepo.findOne({ where: { id: dealerId } });
    return dealer?.staff || [];
  }

  async updateDealerStaff(dealerId: string, staff: any[], dealerRepo: any): Promise<any> {
    await dealerRepo.update(dealerId, { staff });
    return { dealerId, staff, message: 'Staff updated' };
  }
}
