import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer, DealerStatus, DealerTier } from '../../database/entities/dealer.entity';
import { Commission, CommissionStatus } from '../../database/entities/commission.entity';

@Injectable()
export class DealerService {
  constructor(
    @InjectRepository(Dealer) private dealerRepo: Repository<Dealer>,
    @InjectRepository(Commission) private commissionRepo: Repository<Commission>,
  ) {}

  async register(userId: string, data: any): Promise<Dealer> {
    const dealer = this.dealerRepo.create({ ...data, userId, status: DealerStatus.PENDING });
    return this.dealerRepo.save(dealer) as unknown as Promise<Dealer>;
  }

  async findByUser(userId: string): Promise<Dealer> {
    return this.dealerRepo.findOne({ where: { userId } });
  }

  async findAll(): Promise<Dealer[]> {
    return this.dealerRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getPendingApplications(): Promise<Dealer[]> {
    return this.dealerRepo.find({ where: { status: DealerStatus.PENDING } });
  }

  async approve(id: string, tier: DealerTier, approvedBy: string): Promise<Dealer> {
    const commissionMap = { silver: 6, gold: 8, platinum: 10 };
    await this.dealerRepo.update(id, {
      status: DealerStatus.ACTIVE,
      tier,
      approvedBy,
      commissionRate: commissionMap[tier] || 6,
    });
    return this.dealerRepo.findOne({ where: { id } });
  }

  async reject(id: string, reason: string): Promise<Dealer> {
    await this.dealerRepo.update(id, { status: DealerStatus.REJECTED });
    return this.dealerRepo.findOne({ where: { id } });
  }

  async getCommissions(dealerId: string): Promise<Commission[]> {
    return this.commissionRepo.find({ where: { dealerId }, order: { createdAt: 'DESC' } });
  }

  async requestPayout(dealerId: string, amount: number): Promise<{ message: string }> {
    // TODO: Trigger Razorpay payout
    const dealer = await this.dealerRepo.findOne({ where: { id: dealerId } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    return { message: `Payout of ₹${amount} requested. Will be processed within 24 hours.` };
  }

  async creditCommission(dealerId: string, orderId: string, saleAmount: number, rate: number): Promise<Commission> {
    const commissionAmount = (saleAmount * rate) / 100;
    const tdsAmount = commissionAmount > 1500 ? commissionAmount * 0.1 : 0;
    const commission = this.commissionRepo.create({
      dealerId, orderId, saleAmount, commissionRate: rate,
      commissionAmount, tdsAmount, netAmount: commissionAmount - tdsAmount,
    });
    await this.dealerRepo.increment({ id: dealerId }, 'walletBalance', commissionAmount - tdsAmount);
    return this.commissionRepo.save(commission);
  }
}
