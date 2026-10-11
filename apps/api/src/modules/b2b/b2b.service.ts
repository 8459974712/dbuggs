import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { B2bBuyer } from '../../database/entities/b2b-buyer.entity';

const PRICE_SLABS = [
  { minQty: 1, maxQty: 4, discountPercent: 0, label: '1–4 units (MRP)' },
  { minQty: 5, maxQty: 9, discountPercent: 8, label: '5–9 units (8% off)' },
  { minQty: 10, maxQty: 24, discountPercent: 13, label: '10–24 units (13% off)' },
  { minQty: 25, maxQty: 9999, discountPercent: 18, label: '25+ units (18% off)' },
];

@Injectable()
export class B2bService {
  constructor(@InjectRepository(B2bBuyer) private buyerRepo: Repository<B2bBuyer>) {}

  async register(userId: string, data: any): Promise<B2bBuyer> {
    const buyer = this.buyerRepo.create({ ...data, userId });
    return this.buyerRepo.save(buyer) as unknown as Promise<B2bBuyer>;
  }

  async findByUser(userId: string): Promise<B2bBuyer | null> {
    return this.buyerRepo.findOne({ where: { userId } });
  }

  async getPending(): Promise<B2bBuyer[]> {
    return this.buyerRepo.find({ where: { isApproved: false } });
  }

  async approve(id: string, creditLimit: number, approvedBy: string): Promise<B2bBuyer> {
    await this.buyerRepo.update(id, { isApproved: true, creditLimit, approvedBy, approvedAt: new Date() });
    return this.buyerRepo.findOne({ where: { id } });
  }

  async reject(id: string): Promise<void> {
    await this.buyerRepo.delete(id);
  }

  async verifyGstin(gstin: string): Promise<{ valid: boolean; details?: any }> {
    // TODO: Call Surepass GSTIN verification API
    const valid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
    return { valid, details: valid ? { gstin, status: 'Active' } : null };
  }

  async getSlabs() {
    return PRICE_SLABS;
  }

  async getDiscountForQty(qty: number): Promise<number> {
    const slab = PRICE_SLABS.find(s => qty >= s.minQty && qty <= s.maxQty);
    return slab?.discountPercent ?? 0;
  }

  async submitRfq(userId: string, data: any): Promise<{ message: string; rfqId: string }> {
    const rfqId = `RFQ-${Date.now()}`;
    // TODO: Save to rfq_quotations table
    return { message: 'RFQ submitted. Quotation will be sent within 24 hours.', rfqId };
  }

  async generateQuotation(rfqId: string): Promise<{ pdfUrl: string }> {
    // TODO: Generate PDF and upload to S3
    return { pdfUrl: `https://s3.ap-south-1.amazonaws.com/dbugg-docs-prod/quotations/${rfqId}.pdf` };
  }
}
