import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { B2bBuyer } from '../../database/entities/b2b-buyer.entity';
import { B2bLedgerEntry } from '../../database/entities/b2b-ledger.entity';
import { Rfq } from '../../database/entities/rfq.entity';
import { User } from '../../database/entities/user.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';
import { GST_RATE, financialYear, rupeesInWords, validateGstin } from '../../common/india';
import { PdfService, fmtDate, inr } from '../documents/pdf.service';
import { BulkMatchDto, CreateRfqDto, QuoteRfqDto, RecordPaymentDto, RegisterB2bDto } from './b2b.dto';

const PRICE_SLABS = [
  { minQty: 1, maxQty: 4, discountPercent: 0, label: '1–4 units (MRP)' },
  { minQty: 5, maxQty: 9, discountPercent: 8, label: '5–9 units (8% off)' },
  { minQty: 10, maxQty: 24, discountPercent: 13, label: '10–24 units (13% off)' },
  { minQty: 25, maxQty: 9999, discountPercent: 18, label: '25+ units (18% off)' },
];
const ADMIN_ROLES = ['admin', 'super_admin'];
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class B2bService {
  constructor(
    @InjectRepository(B2bBuyer) private buyerRepo: Repository<B2bBuyer>,
    @InjectRepository(B2bLedgerEntry) private ledgerRepo: Repository<B2bLedgerEntry>,
    @InjectRepository(Rfq) private rfqRepo: Repository<Rfq>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    private dataSource: DataSource,
    private pdf: PdfService,
  ) {}

  // ── Registration & approval ──────────────────────────────────────
  async register(userId: string, dto: RegisterB2bDto): Promise<B2bBuyer> {
    const check = validateGstin(dto.gstin);
    if (!check.valid) throw new BadRequestException(check.reason);
    const taken = await this.buyerRepo.findOne({ where: { gstin: check.gstin, userId: Not(userId) } });
    if (taken) throw new ConflictException('This GSTIN is already registered with another account.');
    const address = [dto.address, dto.city].map(s => (s || '').trim()).filter(Boolean).join(', ') || null;
    const existing = await this.buyerRepo.findOne({ where: { userId } });
    if (existing?.isApproved) throw new ConflictException('Your B2B account is already approved. Contact support to change company details.');
    if (existing) {
      await this.buyerRepo.update(existing.id, { companyName: dto.companyName.trim(), gstin: check.gstin, address });
      return this.buyerRepo.findOne({ where: { id: existing.id } });
    }
    return this.buyerRepo.save(this.buyerRepo.create({ userId, companyName: dto.companyName.trim(), gstin: check.gstin, address }));
  }

  async findByUser(userId: string): Promise<B2bBuyer | null> {
    return this.buyerRepo.findOne({ where: { userId } });
  }

  async getPending(): Promise<B2bBuyer[]> {
    return this.buyerRepo.find({ where: { isApproved: false } });
  }

  async listBuyers() {
    const buyers = await this.buyerRepo.find({ order: { createdAt: 'DESC' } });
    const users = buyers.length ? await this.userRepo.find({ where: { id: In(buyers.map(b => b.userId)) } }) : [];
    const byId = new Map(users.map(u => [u.id, u]));
    return buyers.map(b => {
      const u = byId.get(b.userId);
      return {
        ...b,
        creditAvailable: round2(Number(b.creditLimit) - Number(b.creditUsed)),
        contactName: u?.name || null, contactEmail: u?.email || null, contactPhone: u?.phone || null,
      };
    });
  }

  async approve(id: string, creditLimit: number, approvedBy: string): Promise<B2bBuyer> {
    const buyer = await this.buyerRepo.findOne({ where: { id } });
    if (!buyer) throw new NotFoundException('B2B application not found');
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(B2bBuyer).update(id, { isApproved: true, creditLimit, approvedBy, approvedAt: new Date() });
      await m.getRepository(User).update({ id: buyer.userId, role: 'b2c' as any }, { role: 'b2b' as any });
    });
    return this.buyerRepo.findOne({ where: { id } });
  }

  async reject(id: string): Promise<void> {
    const buyer = await this.buyerRepo.findOne({ where: { id } });
    if (!buyer) throw new NotFoundException('B2B application not found');
    if (Number(buyer.creditUsed) > 0) throw new BadRequestException('This buyer has outstanding credit and cannot be removed.');
    await this.buyerRepo.delete(id);
  }

  async verifyGstin(gstin: string) {
    const r = validateGstin(gstin);
    return r.valid
      ? { valid: true, gstin: r.gstin, details: { gstin: r.gstin, stateCode: r.stateCode, state: r.state, pan: r.pan }, source: 'checksum' }
      : { valid: false, gstin: r.gstin, reason: r.reason };
  }

  // ── Slab pricing ─────────────────────────────────────────────────
  async getSlabs() {
    return PRICE_SLABS;
  }

  async getDiscountForQty(qty: number): Promise<number> {
    const slab = PRICE_SLABS.find(s => qty >= s.minQty && qty <= s.maxQty);
    return slab?.discountPercent ?? 0;
  }

  async bulkMatch(user: any, dto: BulkMatchDto) {
    const picked = new Set<string>();
    const lines = [];
    for (const item of dto.items) {
      const qb = this.laptopRepo.createQueryBuilder('l')
        .where('l.status = :st', { st: LaptopStatus.AVAILABLE })
        .andWhere('l."sellingPrice" > 0')
        .andWhere('LOWER(l.brand) = LOWER(:brand)', { brand: item.brand.trim() });
      if (item.model?.trim()) qb.andWhere('l.model ILIKE :model', { model: `%${item.model.trim().replace(/[%_]/g, '')}%` });
      if (item.grade) qb.andWhere('l.grade = :grade', { grade: item.grade });
      if (picked.size) qb.andWhere('l.id NOT IN (:...picked)', { picked: [...picked] });
      const matched = await qb.orderBy('l."sellingPrice"', 'ASC').take(item.qty).getMany();
      matched.forEach(l => picked.add(l.id));
      lines.push({
        input: item,
        shortBy: item.qty - matched.length,
        matched: matched.map(l => ({
          id: l.id, brand: l.brand, model: l.model, grade: l.grade, serialNo: l.serialNo,
          processor: l.processor, ram: l.ram, storage: l.storage, sellingPrice: Number(l.sellingPrice),
        })),
      });
    }
    const units = picked.size;
    const buyer = await this.findByUser(user.id);
    const discountPercent = buyer?.isApproved ? await this.getDiscountForQty(units) : 0;
    const listTotal = lines.reduce((s, ln) => s + ln.matched.reduce((a, l) => a + l.sellingPrice, 0), 0);
    const estimatedTotal = lines.reduce((s, ln) => s + ln.matched.reduce((a, l) => a + Math.round(l.sellingPrice * (1 - discountPercent / 100)), 0), 0);
    return { lines, units, discountPercent, listTotal, estimatedTotal, approved: !!buyer?.isApproved };
  }

  // ── Credit & ledger ──────────────────────────────────────────────
  async chargeCredit(m: EntityManager, userId: string, amount: number, gstAmount: number, reference: string, poNumber: string) {
    const buyer = await m.getRepository(B2bBuyer).createQueryBuilder('b')
      .setLock('pessimistic_write').where('b."userId" = :userId', { userId }).getOne();
    if (!buyer?.isApproved) throw new ForbiddenException('Credit / PO checkout is available only for approved B2B buyers.');
    const used = Number(buyer.creditUsed);
    const available = round2(Number(buyer.creditLimit) - used);
    if (amount > available) {
      throw new BadRequestException(`Insufficient credit. Available credit is ${inr(available)} but this order is ${inr(amount)}.`);
    }
    const balanceAfter = round2(used + amount);
    await m.getRepository(B2bBuyer).update(buyer.id, { creditUsed: balanceAfter });
    await m.getRepository(B2bLedgerEntry).save(m.getRepository(B2bLedgerEntry).create({
      buyerId: buyer.id, userId, type: 'debit', amount: round2(amount), gstAmount: round2(gstAmount),
      reference, poNumber, note: `Purchase on credit — PO ${poNumber}`, balanceAfter, createdBy: userId,
    }));
  }

  async reverseCredit(m: EntityManager, userId: string, amount: number, gstAmount: number, reference: string, note: string, createdBy: string) {
    const buyer = await m.getRepository(B2bBuyer).createQueryBuilder('b')
      .setLock('pessimistic_write').where('b."userId" = :userId', { userId }).getOne();
    if (!buyer) return;
    const balanceAfter = round2(Math.max(0, Number(buyer.creditUsed) - amount));
    await m.getRepository(B2bBuyer).update(buyer.id, { creditUsed: balanceAfter });
    await m.getRepository(B2bLedgerEntry).save(m.getRepository(B2bLedgerEntry).create({
      buyerId: buyer.id, userId, type: 'credit', amount: round2(amount), gstAmount: round2(gstAmount),
      reference, note, balanceAfter, createdBy,
    }));
  }

  async recordPayment(buyerId: string, dto: RecordPaymentDto, adminId: string) {
    return this.dataSource.transaction(async (m) => {
      const buyer = await m.getRepository(B2bBuyer).createQueryBuilder('b')
        .setLock('pessimistic_write').where('b.id = :id', { id: buyerId }).getOne();
      if (!buyer) throw new NotFoundException('B2B buyer not found');
      const used = Number(buyer.creditUsed);
      if (dto.amount > used) throw new BadRequestException(`Payment exceeds the outstanding balance of ${inr(used)}.`);
      const balanceAfter = round2(used - dto.amount);
      await m.getRepository(B2bBuyer).update(buyer.id, { creditUsed: balanceAfter });
      return m.getRepository(B2bLedgerEntry).save(m.getRepository(B2bLedgerEntry).create({
        buyerId: buyer.id, userId: buyer.userId, type: 'credit', amount: round2(dto.amount), gstAmount: 0,
        reference: dto.reference.trim(), note: dto.note?.trim() || 'Payment received', balanceAfter, createdBy: adminId,
      }));
    });
  }

  async ledger(buyerId: string) {
    const buyer = await this.buyerRepo.findOne({ where: { id: buyerId } });
    if (!buyer) throw new NotFoundException('B2B buyer not found');
    const entries = await this.ledgerRepo.find({ where: { buyerId }, order: { createdAt: 'DESC' }, take: 500 });
    const sum = (t: string, f: 'amount' | 'gstAmount') => round2(entries.filter(e => e.type === t).reduce((s, e) => s + Number(e[f]), 0));
    return {
      buyer: { id: buyer.id, companyName: buyer.companyName, gstin: buyer.gstin, isApproved: buyer.isApproved },
      summary: {
        creditLimit: Number(buyer.creditLimit), creditUsed: Number(buyer.creditUsed),
        creditAvailable: round2(Number(buyer.creditLimit) - Number(buyer.creditUsed)),
        totalDebits: sum('debit', 'amount'), totalCredits: sum('credit', 'amount'),
        gstOnPurchases: round2(sum('debit', 'gstAmount') - sum('credit', 'gstAmount')),
      },
      entries,
    };
  }

  async myLedger(userId: string) {
    const buyer = await this.findByUser(userId);
    if (!buyer) throw new NotFoundException('You are not registered as a B2B buyer.');
    return this.ledger(buyer.id);
  }

  // ── RFQ & quotations ─────────────────────────────────────────────
  async submitRfq(userId: string, dto: CreateRfqDto) {
    const buyer = await this.findByUser(userId);
    if (!buyer) throw new ForbiddenException('Register your business for B2B before requesting a quotation.');
    const d = new Date();
    const rfqNumber = `RFQ-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const rfq = await this.rfqRepo.save(this.rfqRepo.create({
      rfqNumber, userId, buyerId: buyer.id, companyName: buyer.companyName, details: dto.details.trim(), status: 'open',
    }));
    return { message: 'RFQ submitted. Our team will send a quotation within 24 hours.', rfqId: rfq.rfqNumber, rfq };
  }

  private expireIfNeeded(r: Rfq): Rfq {
    if (r.status === 'quoted' && r.validUntil && new Date(r.validUntil) < new Date()) r.status = 'expired';
    return r;
  }

  async myRfqs(userId: string) {
    const list = await this.rfqRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return list.map(r => this.expireIfNeeded(r));
  }

  async adminRfqs(status?: string) {
    const list = await this.rfqRepo.find({ order: { createdAt: 'DESC' }, take: 500 });
    const out = list.map(r => this.expireIfNeeded(r));
    return status ? out.filter(r => r.status === status) : out;
  }

  async quote(id: string, dto: QuoteRfqDto, adminId: string) {
    const rfq = await this.rfqRepo.findOne({ where: { id } });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.status === 'accepted') throw new BadRequestException('This quotation was already accepted by the buyer.');
    const items = dto.items.map(i => ({ description: i.description.trim(), qty: i.qty, unitPrice: round2(i.unitPrice) }));
    const subtotal = round2(items.reduce((s, i) => s + i.qty * i.unitPrice, 0));
    const gstAmount = round2(subtotal * GST_RATE);
    const validUntil = new Date(Date.now() + (dto.validDays || 15) * 86400000);
    await this.rfqRepo.update(id, {
      quoteItems: items, subtotal, gstAmount, total: round2(subtotal + gstAmount), validUntil, status: 'quoted',
      adminNotes: dto.notes?.trim() || null, quotedBy: adminId, quotedAt: new Date(),
      quotationNumber: rfq.quotationNumber || `QT/${financialYear()}/${rfq.rfqNumber.slice(4)}`,
    });
    return this.rfqRepo.findOne({ where: { id } });
  }

  async respond(userId: string, id: string, accept: boolean) {
    const rfq = await this.rfqRepo.findOne({ where: { id, userId } });
    if (!rfq) throw new NotFoundException('RFQ not found');
    this.expireIfNeeded(rfq);
    if (rfq.status === 'expired') {
      await this.rfqRepo.update(id, { status: 'expired' });
      throw new BadRequestException('This quotation has expired. Please submit a new RFQ.');
    }
    if (rfq.status !== 'quoted') throw new BadRequestException('Only an open quotation can be accepted or declined.');
    await this.rfqRepo.update(id, { status: accept ? 'accepted' : 'declined' });
    return this.rfqRepo.findOne({ where: { id } });
  }

  async quotationPdf(user: any, id: string): Promise<{ filename: string; buffer: Buffer }> {
    const rfq = await this.rfqRepo.findOne({ where: { id } });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.userId !== user.id && !ADMIN_ROLES.includes(user.role)) throw new ForbiddenException();
    if (!rfq.quoteItems?.length) throw new BadRequestException('This RFQ has not been quoted yet.');
    const buyer = await this.buyerRepo.findOne({ where: { id: rfq.buyerId } });
    const contact = await this.userRepo.findOne({ where: { id: rfq.userId } });
    const seller = this.pdf.seller();
    const buffer = await this.pdf.render((doc) => {
      this.pdf.header(doc, 'QUOTATION', [
        ['Quotation No.', rfq.quotationNumber],
        ['Date', fmtDate(rfq.quotedAt || rfq.updatedAt)],
        ['Valid until', rfq.validUntil ? fmtDate(rfq.validUntil) : '—'],
        ['RFQ Ref.', rfq.rfqNumber],
      ]);
      this.pdf.partyBlocks(doc, [
        { title: 'Prepared for', lines: [buyer?.companyName || rfq.companyName, buyer?.gstin ? `GSTIN: ${buyer.gstin}` : '', buyer?.address || '', contact?.name ? `Attn: ${contact.name}` : '', contact?.email || ''] },
        { title: 'Your requirement', lines: [rfq.details.length > 400 ? rfq.details.slice(0, 400) + '…' : rfq.details] },
      ]);
      this.pdf.table(doc, [
        { label: '#', width: 5 }, { label: 'Description', width: 47 }, { label: 'Qty', width: 8, align: 'right' },
        { label: 'Unit Price', width: 18, align: 'right' }, { label: 'Amount', width: 22, align: 'right' },
      ], rfq.quoteItems.map((i, n) => [String(n + 1), i.description, String(i.qty), inr(i.unitPrice), inr(i.qty * i.unitPrice)]));
      this.pdf.totals(doc, [
        ['Subtotal (excl. GST)', inr(rfq.subtotal)],
        ['GST @ 18%', inr(rfq.gstAmount)],
        ['Total payable', inr(rfq.total), true],
      ]);
      this.pdf.note(doc, 'Amount in words', rupeesInWords(Number(rfq.total)));
      if (rfq.adminNotes) this.pdf.note(doc, 'Notes', rfq.adminNotes);
      this.pdf.note(doc, 'Terms', `Prices are per unit and exclusive of GST (18%, HSN 8471). Refurbished units are QC tested and graded, and carry the ${seller.name} warranty stated per unit. Stock is confirmed at the time of order. This quotation is valid until ${rfq.validUntil ? fmtDate(rfq.validUntil) : 'the date above'}.`);
      this.pdf.signature(doc, 'Authorised Signatory');
    });
    return { filename: `Quotation-${rfq.rfqNumber}.pdf`, buffer };
  }
}
