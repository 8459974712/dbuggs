import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer, DealerStatus, DealerTier } from '../../database/entities/dealer.entity';
import { Commission, CommissionStatus } from '../../database/entities/commission.entity';
import { DealerStockOrder, StockOrderStatus } from '../../database/entities/dealer-stock-order.entity';
import { DealerSale } from '../../database/entities/dealer-sale.entity';
import { DealerLead, LeadStatus } from '../../database/entities/dealer-lead.entity';
import { DealerTarget } from '../../database/entities/dealer-target.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';

@Injectable()
export class DealerService {
  constructor(
    @InjectRepository(Dealer) private dealerRepo: Repository<Dealer>,
    @InjectRepository(Commission) private commissionRepo: Repository<Commission>,
    @InjectRepository(DealerStockOrder) private stockOrderRepo: Repository<DealerStockOrder>,
    @InjectRepository(DealerSale) private saleRepo: Repository<DealerSale>,
    @InjectRepository(DealerLead) private leadRepo: Repository<DealerLead>,
    @InjectRepository(DealerTarget) private targetRepo: Repository<DealerTarget>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
  ) {}

  async register(userId: string, data: any): Promise<Dealer> {
    const existing = await this.dealerRepo.findOne({ where: { userId } });
    if (existing) throw new BadRequestException('Already registered as dealer');
    const dealer = this.dealerRepo.create({
      userId, companyName: data.companyName, gstin: data.gstin,
      contactPerson: data.contactPerson, phone: data.phone, email: data.email,
      address: data.address, territory: data.territory,
      bankDetails: data.bankDetails, kycDocuments: data.kycDocuments,
      status: DealerStatus.PENDING, kycStatus: 'pending',
    });
    return this.dealerRepo.save(dealer) as unknown as Promise<Dealer>;
  }

  async findByUser(userId: string): Promise<Dealer> {
    return this.dealerRepo.findOne({ where: { userId } });
  }

  async updateProfile(userId: string, data: any): Promise<Dealer> {
    const dealer = await this.dealerRepo.findOne({ where: { userId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    if (data.bankDetails) dealer.bankDetails = data.bankDetails;
    if (data.kycDocuments) dealer.kycDocuments = { ...dealer.kycDocuments, ...data.kycDocuments };
    if (data.phone) dealer.phone = data.phone;
    if (data.address) dealer.address = data.address;
    if (data.staff) dealer.staff = data.staff;
    return this.dealerRepo.save(dealer);
  }

  async findAll(): Promise<Dealer[]> {
    return this.dealerRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getPendingApplications(): Promise<Dealer[]> {
    return this.dealerRepo.find({ where: { status: DealerStatus.PENDING } });
  }

  async approve(id: string, body: any, approvedBy: string): Promise<Dealer> {
    const commissionMap: any = { silver: 6, gold: 8, platinum: 10 };
    const tier = body.tier || DealerTier.SILVER;
    await this.dealerRepo.update(id, {
      status: DealerStatus.ACTIVE, tier, approvedBy,
      commissionRate: commissionMap[tier] || 6,
      creditLimit: body.creditLimit || 100000,
      kycStatus: 'approved',
    });
    return this.dealerRepo.findOne({ where: { id } });
  }

  async reject(id: string, reason: string): Promise<Dealer> {
    await this.dealerRepo.update(id, { status: DealerStatus.REJECTED });
    return this.dealerRepo.findOne({ where: { id } });
  }

  async updateDealer(id: string, data: any): Promise<Dealer> {
    const allowed: any = {};
    if (data.tier) allowed.tier = data.tier;
    if (data.commissionRate !== undefined) allowed.commissionRate = data.commissionRate;
    if (data.creditLimit !== undefined) allowed.creditLimit = data.creditLimit;
    if (data.territory) allowed.territory = data.territory;
    if (data.pincodes) allowed.pincodes = data.pincodes;
    if (data.status) allowed.status = data.status;
    if (data.gstinVerified !== undefined) allowed.gstinVerified = data.gstinVerified;
    if (data.bankVerified !== undefined) allowed.bankVerified = data.bankVerified;
    if (data.kycStatus) allowed.kycStatus = data.kycStatus;
    await this.dealerRepo.update(id, allowed);
    return this.dealerRepo.findOne({ where: { id } });
  }

  async createStockOrder(dealerId: string, items: { laptopId: string }[]): Promise<DealerStockOrder> {
    const dealer = await this.dealerRepo.findOne({ where: { id: dealerId } });
    if (!dealer || dealer.status !== DealerStatus.ACTIVE) throw new BadRequestException('Dealer not active');
    const orderItems: any[] = [];
    let total = 0;
    for (const item of items) {
      const laptop = await this.laptopRepo.findOne({ where: { id: item.laptopId, status: LaptopStatus.AVAILABLE } });
      if (!laptop) throw new BadRequestException('Laptop ' + item.laptopId.slice(0,8) + ' not available');
      const price = Number(laptop.dealerPrice || laptop.sellingPrice);
      orderItems.push({ laptopId: laptop.id, brand: laptop.brand, model: laptop.model, dealerPrice: price });
      total += price;
    }
    if (Number(dealer.creditLimit) > 0 && (Number(dealer.creditUsed) + total) > Number(dealer.creditLimit)) {
      throw new BadRequestException('Credit limit exceeded');
    }
    const order = this.stockOrderRepo.create({
      dealerId, items: orderItems, totalUnits: orderItems.length, totalAmount: total,
      orderNumber: 'DSO-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(),
    });
    return this.stockOrderRepo.save(order);
  }

  async getMyStockOrders(dealerId: string): Promise<DealerStockOrder[]> {
    return this.stockOrderRepo.find({ where: { dealerId }, order: { createdAt: 'DESC' } });
  }

  async getAllStockOrders(): Promise<DealerStockOrder[]> {
    return this.stockOrderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async updateStockOrder(id: string, data: any): Promise<DealerStockOrder> {
    const order = await this.stockOrderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Stock order not found');
    if (data.status === 'approved' && order.status === StockOrderStatus.PENDING) {
      await this.dealerRepo.increment({ id: order.dealerId }, 'creditUsed', Number(order.totalAmount));
      for (const item of order.items) {
        await this.laptopRepo.update(item.laptopId, { status: LaptopStatus.RESERVED });
      }
    }
    if (data.status === 'delivered') {
      for (const item of order.items) {
        await this.laptopRepo.update(item.laptopId, { status: LaptopStatus.SOLD });
      }
    }
    if (data.status) order.status = data.status as StockOrderStatus;
    if (data.adminNotes) order.adminNotes = data.adminNotes;
    if (data.trackingId) order.trackingId = data.trackingId;
    return this.stockOrderRepo.save(order);
  }

  async getMyInventory(dealerId: string): Promise<any> {
    const orders = await this.stockOrderRepo.find({ where: { dealerId } });
    const delivered = orders.filter(o => o.status === StockOrderStatus.DELIVERED);
    const allItems = delivered.flatMap(o => o.items);
    const sales = await this.saleRepo.find({ where: { dealerId } });
    const soldIds = new Set(sales.map(s => s.laptopId));
    return {
      total: allItems.length, sold: soldIds.size, inStock: allItems.length - soldIds.size,
      items: allItems.map(item => ({ ...item, sold: soldIds.has(item.laptopId) })),
    };
  }

  async recordSale(dealerId: string, data: any): Promise<DealerSale> {
    const dealer = await this.dealerRepo.findOne({ where: { id: dealerId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const saleAmount = Number(data.saleAmount);
    const gstAmount = Math.round(saleAmount * 18 / 118 * 100) / 100;
    const rate = Number(dealer.commissionRate || 6);
    const commissionEarned = Math.round(saleAmount * rate / 100 * 100) / 100;
    const sale = this.saleRepo.create({
      dealerId, laptopId: data.laptopId, customerName: data.customerName,
      customerPhone: data.customerPhone, saleAmount, gstAmount, commissionEarned,
      invoiceNumber: 'DSI-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(),
    });
    const saved = await this.saleRepo.save(sale);
    await this.creditCommission(dealerId, saved.id, saleAmount, rate);
    await this.dealerRepo.increment({ id: dealerId }, 'totalSales', 1);
    await this.dealerRepo.increment({ id: dealerId }, 'totalRevenue', saleAmount);
    const month = new Date().toISOString().slice(0,7);
    const target = await this.targetRepo.findOne({ where: { dealerId, month } });
    if (target) {
      await this.targetRepo.increment({ id: target.id }, 'achievedUnits', 1);
      await this.targetRepo.increment({ id: target.id }, 'achievedRevenue', saleAmount);
    }
    return saved;
  }

  async getMySales(dealerId: string): Promise<DealerSale[]> {
    return this.saleRepo.find({ where: { dealerId }, order: { createdAt: 'DESC' } });
  }

  async creditCommission(dealerId: string, orderId: string, saleAmount: number, rate: number): Promise<Commission> {
    const commissionAmount = Math.round(saleAmount * rate / 100 * 100) / 100;
    const tdsAmount = commissionAmount > 1500 ? Math.round(commissionAmount * 0.1 * 100) / 100 : 0;
    const netAmount = commissionAmount - tdsAmount;
    const commission = this.commissionRepo.create({
      dealerId, orderId, saleAmount, commissionRate: rate,
      commissionAmount, tdsAmount, netAmount,
    });
    await this.dealerRepo.increment({ id: dealerId }, 'walletBalance', netAmount);
    return this.commissionRepo.save(commission);
  }

  async getCommissions(dealerId: string): Promise<Commission[]> {
    return this.commissionRepo.find({ where: { dealerId }, order: { createdAt: 'DESC' } });
  }

  async requestPayout(dealerId: string, amount: number): Promise<any> {
    const dealer = await this.dealerRepo.findOne({ where: { id: dealerId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    if (Number(dealer.walletBalance) < amount) throw new BadRequestException('Insufficient balance');
    await this.dealerRepo.decrement({ id: dealerId }, 'walletBalance', amount);
    const commission = this.commissionRepo.create({
      dealerId, orderId: 'PAYOUT-' + Date.now(), saleAmount: 0,
      commissionRate: 0, commissionAmount: 0, tdsAmount: 0, netAmount: -amount,
      status: CommissionStatus.PENDING,
    });
    await this.commissionRepo.save(commission);
    return { message: 'Payout requested', amount, payoutId: commission.id };
  }

  async adminApprovePayout(commissionId: string): Promise<Commission> {
    await this.commissionRepo.update(commissionId, { status: CommissionStatus.PAID });
    return this.commissionRepo.findOne({ where: { id: commissionId } });
  }

  async createLead(dealerId: string, data: any): Promise<DealerLead> {
    return this.leadRepo.save(this.leadRepo.create({ dealerId, ...data })) as unknown as Promise<DealerLead>;
  }

  async getMyLeads(dealerId: string): Promise<DealerLead[]> {
    return this.leadRepo.find({ where: { dealerId }, order: { createdAt: 'DESC' } });
  }

  async updateLead(id: string, dealerId: string, data: any): Promise<DealerLead> {
    const lead = await this.leadRepo.findOne({ where: { id, dealerId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (data.status) lead.status = data.status;
    if (data.notes) lead.notes = data.notes;
    if (data.followUpDate) lead.followUpDate = data.followUpDate;
    return this.leadRepo.save(lead);
  }

  async getAllLeads(): Promise<DealerLead[]> {
    return this.leadRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getMyTargets(dealerId: string): Promise<DealerTarget[]> {
    return this.targetRepo.find({ where: { dealerId }, order: { month: 'DESC' } });
  }

  async getAllTargets(): Promise<DealerTarget[]> {
    return this.targetRepo.find({ order: { month: 'DESC' } });
  }

  async setTarget(data: any): Promise<DealerTarget> {
    const existing = await this.targetRepo.findOne({ where: { dealerId: data.dealerId, month: data.month } });
    if (existing) {
      Object.assign(existing, data);
      return this.targetRepo.save(existing);
    }
    return this.targetRepo.save(this.targetRepo.create(data)) as unknown as Promise<DealerTarget>;
  }

  async getDashboard(dealerId: string): Promise<any> {
    const dealer = await this.dealerRepo.findOne({ where: { id: dealerId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const commissions = await this.commissionRepo.find({ where: { dealerId } });
    const leads = await this.leadRepo.find({ where: { dealerId } });
    const stockOrders = await this.stockOrderRepo.find({ where: { dealerId } });
    const sales = await this.saleRepo.find({ where: { dealerId } });
    const month = new Date().toISOString().slice(0,7);
    const target = await this.targetRepo.findOne({ where: { dealerId, month } });
    const totalCommission = commissions.filter(c => Number(c.netAmount) > 0).reduce((s, c) => s + Number(c.netAmount), 0);
    return {
      dealer: { id: dealer.id, companyName: dealer.companyName, tier: dealer.tier, status: dealer.status, walletBalance: Number(dealer.walletBalance), creditLimit: Number(dealer.creditLimit), creditUsed: Number(dealer.creditUsed), commissionRate: Number(dealer.commissionRate), totalSales: dealer.totalSales, totalRevenue: Number(dealer.totalRevenue) },
      stats: { totalOrders: stockOrders.length, pendingOrders: stockOrders.filter(o => o.status === StockOrderStatus.PENDING).length, totalSales: sales.length, activeLeads: leads.filter(l => l.status !== LeadStatus.CONVERTED && l.status !== LeadStatus.LOST).length, totalCommission: Math.round(totalCommission * 100) / 100 },
      currentTarget: target || null, recentSales: sales.slice(0, 5), recentLeads: leads.slice(0, 5),
    };
  }

  async getLeaderboard(): Promise<any[]> {
    const dealers = await this.dealerRepo.find({ where: { status: DealerStatus.ACTIVE }, order: { totalRevenue: 'DESC' } });
    return dealers.map((d, i) => ({
      rank: i + 1, dealerId: d.id, companyName: d.companyName, tier: d.tier,
      totalSales: d.totalSales, totalRevenue: Number(d.totalRevenue), commissionRate: Number(d.commissionRate),
    }));
  }
}
