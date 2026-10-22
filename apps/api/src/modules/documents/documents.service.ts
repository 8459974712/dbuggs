import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Invoice, InvoiceKind } from '../../database/entities/invoice.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Laptop } from '../../database/entities/laptop.entity';
import { User } from '../../database/entities/user.entity';
import { B2bBuyer } from '../../database/entities/b2b-buyer.entity';
import { LaptopQc } from '../../database/entities/laptop-qc.entity';
import {
  GST_STATES, HSN_LAPTOP, financialYear, pincodeFromAddress, rupeesInWords, splitInclusiveGst, stateCodeFromPincode,
} from '../../common/india';
import { PdfService, fmtDate, inr } from './pdf.service';

export const INVOICEABLE: OrderStatus[] = [
  OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED,
  OrderStatus.RETURN_REQUESTED, OrderStatus.RETURNED,
];

export function paymentLabel(paymentId: string): string {
  const p = paymentId || '';
  if (p.startsWith('COD:')) return 'Cash on Delivery';
  if (p.startsWith('CREDIT:')) return `On credit${p.split(':')[2] ? ` (PO No. ${p.split(':').slice(2).join(':')})` : ''}`;
  if (p.startsWith('CHK-')) return 'Online (Razorpay)';
  return p ? p : '—';
}

function specs(l: Laptop): string {
  return [l.processor, l.ram, l.storage, l.display].filter(Boolean).join(' · ');
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

function csvCell(v: any): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(B2bBuyer) private buyerRepo: Repository<B2bBuyer>,
    @InjectRepository(LaptopQc) private qcRepo: Repository<LaptopQc>,
    private dataSource: DataSource,
    private pdf: PdfService,
  ) {}

  private async nextNumber(m: EntityManager, prefix: string): Promise<string> {
    await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);
    const last = await m.getRepository(Invoice).createQueryBuilder('i')
      .select('i.number', 'number')
      .where('i.number LIKE :p', { p: `${prefix}%` })
      .orderBy('i.number', 'DESC')
      .limit(1)
      .getRawOne();
    const seq = last ? parseInt(String(last.number).slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  private async loadOrder(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const [laptop, user, buyer] = await Promise.all([
      this.laptopRepo.findOne({ where: { id: order.laptopId } }),
      this.userRepo.findOne({ where: { id: order.userId } }),
      this.buyerRepo.findOne({ where: { userId: order.userId } }),
    ]);
    return { order, laptop, user, buyer };
  }

  async ensureInvoice(orderId: string): Promise<Invoice> {
    const existing = await this.invoiceRepo.findOne({ where: { orderId, kind: 'invoice' } });
    if (existing) return existing;
    const { order, user, buyer } = await this.loadOrder(orderId);
    if (!INVOICEABLE.includes(order.status)) {
      throw new BadRequestException('The tax invoice is generated once the order is confirmed.');
    }
    const seller = this.pdf.seller();
    const buyerGstin = buyer?.isApproved && buyer.gstin ? buyer.gstin : null;
    const pos = buyerGstin ? buyerGstin.slice(0, 2) : stateCodeFromPincode(pincodeFromAddress(order.shippingAddress));
    const split = splitInclusiveGst(Number(order.amount), seller.stateCode, pos);
    try {
      return await this.dataSource.transaction(async (m) => {
        const again = await m.getRepository(Invoice).findOne({ where: { orderId, kind: 'invoice' } });
        if (again) return again;
        const number = await this.nextNumber(m, `DBG/${financialYear()}/`);
        const inv = m.getRepository(Invoice).create({
          number, kind: 'invoice', orderId, userId: order.userId,
          taxable: split.taxable, cgst: split.cgst, sgst: split.sgst, igst: split.igst, total: split.total,
          placeOfSupplyCode: pos || seller.stateCode,
          buyerGstin,
          buyerName: buyerGstin ? (buyer.companyName || user?.name) : (user?.name || (order.shippingAddress || '').split(',')[0]),
          buyerAddress: order.shippingAddress,
        });
        const saved = await m.getRepository(Invoice).save(inv);
        await m.getRepository(Order).update(order.id, { gstInvoiceUrl: `/orders/${order.id}/invoice.pdf` });
        return saved;
      });
    } catch (e) {
      const raced = await this.invoiceRepo.findOne({ where: { orderId, kind: 'invoice' } });
      if (raced) return raced;
      throw e;
    }
  }

  async tryEnsureInvoice(orderId: string): Promise<void> {
    try { await this.ensureInvoice(orderId); } catch (e) { this.logger.warn(`Invoice for ${orderId} not generated: ${e?.message || e}`); }
  }

  async ensureCreditNote(orderId: string): Promise<Invoice | null> {
    const existing = await this.invoiceRepo.findOne({ where: { orderId, kind: 'credit_note' } });
    if (existing) return existing;
    const invoice = await this.invoiceRepo.findOne({ where: { orderId, kind: 'invoice' } });
    if (!invoice) return null;
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (![OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(order?.status)) {
      throw new BadRequestException('A credit note is issued only for cancelled or returned orders.');
    }
    try {
      return await this.dataSource.transaction(async (m) => {
        const again = await m.getRepository(Invoice).findOne({ where: { orderId, kind: 'credit_note' } });
        if (again) return again;
        const number = await this.nextNumber(m, `DBG-CN/${financialYear()}/`);
        const { id, number: _n, kind: _k, createdAt: _c, ...copy } = invoice;
        return m.getRepository(Invoice).save(m.getRepository(Invoice).create({
          ...copy, number, kind: 'credit_note' as InvoiceKind, originalInvoiceNumber: invoice.number,
        }));
      });
    } catch (e) {
      const raced = await this.invoiceRepo.findOne({ where: { orderId, kind: 'credit_note' } });
      if (raced) return raced;
      throw e;
    }
  }

  async tryEnsureCreditNote(orderId: string): Promise<void> {
    try { await this.ensureCreditNote(orderId); } catch (e) { this.logger.warn(`Credit note for ${orderId} not generated: ${e?.message || e}`); }
  }

  async invoicePdf(orderId: string, kind: InvoiceKind): Promise<{ filename: string; buffer: Buffer }> {
    const inv = kind === 'invoice'
      ? await this.ensureInvoice(orderId)
      : (await this.ensureCreditNote(orderId));
    if (!inv) throw new NotFoundException('No tax invoice was issued for this order, so there is no credit note.');
    const { order, laptop } = await this.loadOrder(orderId);
    const seller = this.pdf.seller();
    const intra = Number(inv.igst) === 0;
    const isCn = inv.kind === 'credit_note';
    const pos = inv.placeOfSupplyCode;
    const buffer = await this.pdf.render((doc) => {
      const meta: [string, string][] = [
        [isCn ? 'Credit Note No.' : 'Invoice No.', inv.number],
        ['Date', fmtDate(inv.createdAt)],
        ['Order No.', order.orderNumber],
        ['Place of Supply', `${GST_STATES[pos] || '—'} (${pos || '—'})`],
      ];
      if (isCn) meta.push(['Against Invoice', inv.originalInvoiceNumber]);
      this.pdf.header(doc, isCn ? 'CREDIT NOTE' : 'TAX INVOICE', meta);
      this.pdf.partyBlocks(doc, [
        { title: 'Billed to', lines: [inv.buyerName, inv.buyerGstin ? `GSTIN: ${inv.buyerGstin}` : 'Unregistered (B2C)', inv.buyerAddress] },
        { title: 'Payment', lines: [paymentLabel(order.paymentId), `Supply type: ${intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}`, 'Reverse charge: No'] },
      ]);
      const desc = laptop
        ? `${laptop.brand} ${laptop.model}\nRefurbished laptop · Grade ${laptop.grade || '—'}\n${specs(laptop)}\nSerial No: ${laptop.serialNo}`
        : 'Refurbished laptop';
      const cols = intra
        ? [{ label: '#', width: 4 }, { label: 'Item & Description', width: 38 }, { label: 'HSN', width: 8 }, { label: 'Qty', width: 5, align: 'right' as const },
          { label: 'Taxable Value', width: 14, align: 'right' as const }, { label: 'CGST 9%', width: 11, align: 'right' as const },
          { label: 'SGST 9%', width: 11, align: 'right' as const }, { label: 'Total', width: 14, align: 'right' as const }]
        : [{ label: '#', width: 4 }, { label: 'Item & Description', width: 42 }, { label: 'HSN', width: 8 }, { label: 'Qty', width: 5, align: 'right' as const },
          { label: 'Taxable Value', width: 15, align: 'right' as const }, { label: 'IGST 18%', width: 13, align: 'right' as const },
          { label: 'Total', width: 15, align: 'right' as const }];
      const row = intra
        ? ['1', desc, HSN_LAPTOP, '1', inr(inv.taxable), inr(inv.cgst), inr(inv.sgst), inr(inv.total)]
        : ['1', desc, HSN_LAPTOP, '1', inr(inv.taxable), inr(inv.igst), inr(inv.total)];
      this.pdf.table(doc, cols, [row]);
      const totals: [string, string, boolean?][] = [['Taxable value', inr(inv.taxable)]];
      if (intra) { totals.push(['CGST @ 9%', inr(inv.cgst)], ['SGST @ 9%', inr(inv.sgst)]); } else { totals.push(['IGST @ 18%', inr(inv.igst)]); }
      totals.push([isCn ? 'Credit amount' : 'Invoice total', inr(inv.total), true]);
      this.pdf.totals(doc, totals);
      this.pdf.note(doc, 'Amount in words', rupeesInWords(Number(inv.total)));
      if (isCn) {
        this.pdf.note(doc, 'Reason', `Order ${order.orderNumber} was ${order.status === OrderStatus.RETURNED ? 'returned' : 'cancelled'}. This credit note reverses invoice ${inv.originalInvoiceNumber}.`);
      } else {
        this.pdf.note(doc, 'Terms', `Prices are inclusive of GST. ${laptop?.warrantyMonths ? `This refurbished laptop carries a ${laptop.warrantyMonths}-month ${seller.name} warranty. ` : ''}Returns are accepted as per the ${seller.name} return policy.`);
      }
      if (!seller.gstin) this.pdf.note(doc, 'Note', 'Seller GSTIN is not configured yet.');
      this.pdf.signature(doc, 'Authorised Signatory');
    });
    return { filename: `${inv.number.replace(/\//g, '-')}.pdf`, buffer };
  }

  async warrantyCardPdf(orderId: string): Promise<{ filename: string; buffer: Buffer }> {
    const { order, laptop, user } = await this.loadOrder(orderId);
    if (!INVOICEABLE.includes(order.status) || order.status === OrderStatus.RETURNED) {
      throw new BadRequestException('The warranty card is available once the order is confirmed.');
    }
    if (!laptop) throw new NotFoundException('Product not found');
    const months = Number(laptop.warrantyMonths) || 0;
    const start = new Date(order.createdAt);
    const seller = this.pdf.seller();
    const buffer = await this.pdf.render((doc) => {
      this.pdf.header(doc, 'WARRANTY CARD', [
        ['Card No.', `WC-${order.orderNumber}`],
        ['Order No.', order.orderNumber],
        ['Warranty from', fmtDate(start)],
        ['Valid until', months ? fmtDate(addMonths(start, months)) : 'No warranty'],
      ]);
      this.pdf.partyBlocks(doc, [
        { title: 'Customer', lines: [user?.name || (order.shippingAddress || '').split(',')[0], user?.phone ? `Phone: ${user.phone}` : '', user?.email || ''] },
        { title: 'Product', lines: [`${laptop.brand} ${laptop.model}`, `Serial No: ${laptop.serialNo}`, `Grade ${laptop.grade || '—'}`, specs(laptop)] },
      ]);
      this.pdf.table(doc, [{ label: 'Coverage', width: 30 }, { label: 'Details', width: 70 }], [
        ['Period', months ? `${months} months from the order date` : 'This unit was sold without warranty'],
        ['Covered', 'Hardware defects and functional failures under normal use: motherboard, display, keyboard, touchpad, ports, speakers, Wi-Fi.'],
        ['Not covered', 'Physical or liquid damage, burn marks, tampering or repair by third parties, software and data issues, consumables and accessories.'],
        ['How to claim', `Open My Orders on the ${seller.name} website and raise a warranty claim on this order, or contact support with the card number above.`],
      ]);
      this.pdf.note(doc, 'Important', 'Keep this card and the tax invoice for warranty service. The serial number on the unit must match the serial number printed above.');
      this.pdf.signature(doc, 'Authorised Signatory');
    });
    return { filename: `Warranty-${order.orderNumber}.pdf`, buffer };
  }

  async qcReportPdf(laptopId: string, internal: boolean): Promise<{ filename: string; buffer: Buffer }> {
    const laptop = await this.laptopRepo.findOne({ where: { id: laptopId } });
    if (!laptop) throw new NotFoundException('Laptop not found');
    const qc = await this.qcRepo.findOne({ where: { laptopId }, order: { createdAt: 'DESC' } });
    if (!qc) throw new NotFoundException('QC report is not available for this unit yet.');
    const checklist = (qc.checklist && typeof qc.checklist === 'object') ? qc.checklist : {};
    const entries = Object.entries(checklist);
    const passed = entries.filter(([, v]) => !!v).length;
    const buffer = await this.pdf.render((doc) => {
      this.pdf.header(doc, 'QC INSPECTION REPORT', [
        ['Report No.', `QC-${laptop.serialNo}`],
        ['Inspected on', fmtDate(qc.createdAt)],
        ['Final grade', qc.gradedAs || laptop.grade || 'Pending'],
        ['Checks passed', `${passed} / ${entries.length}`],
      ]);
      this.pdf.partyBlocks(doc, [
        { title: 'Unit', lines: [`${laptop.brand} ${laptop.model}`, `Serial No: ${laptop.serialNo}`, specs(laptop)] },
        { title: 'Health', lines: [
          qc.batteryPercent != null ? `Battery health: ${Number(qc.batteryPercent)}%` : 'Battery health: not recorded',
          `Parts replaced: ${qc.partsReplaced || 'None'}`,
          laptop.warrantyMonths ? `Warranty: ${laptop.warrantyMonths} months` : '',
        ] },
      ]);
      this.pdf.table(doc, [{ label: 'Inspection point', width: 70 }, { label: 'Result', width: 30, align: 'center' }],
        entries.length ? entries.map(([k, v]) => [k, v ? 'PASS' : 'FAIL']) : [['No checklist recorded', '—']]);
      if (internal && qc.adminNotes) this.pdf.note(doc, 'Technician / admin notes', qc.adminNotes);
      this.pdf.note(doc, 'About grading', 'A+: like new · A: excellent, minimal signs of use · B: good, visible wear · C: fair, noticeable wear. Every unit is tested on the checklist above before it is listed.');
    });
    return { filename: `QC-Report-${laptop.serialNo}.pdf`, buffer };
  }

  private monthRange(month: number, year: number) {
    if (!(month >= 1 && month <= 12) || !(year >= 2020 && year <= 2100)) throw new BadRequestException('Invalid month/year');
    return [`${year}-${String(month).padStart(2, '0')}-01`, month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`];
  }

  async monthlySummary(month: number, year: number) {
    const [from, to] = this.monthRange(month, year);
    const rows = await this.invoiceRepo.createQueryBuilder('i')
      .select('i.kind', 'kind')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(i.taxable),0)', 'taxable')
      .addSelect('COALESCE(SUM(i.cgst),0)', 'cgst')
      .addSelect('COALESCE(SUM(i.sgst),0)', 'sgst')
      .addSelect('COALESCE(SUM(i.igst),0)', 'igst')
      .addSelect('COALESCE(SUM(i.total),0)', 'total')
      .where(`((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') >= :from AND ((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') < :to`, { from, to })
      .groupBy('i.kind')
      .getRawMany();
    const pick = (k: string) => rows.find(r => r.kind === k) || { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    const inv = pick('invoice');
    const cn = pick('credit_note');
    const n = (v: any) => Math.round(Number(v) * 100) / 100;
    const net = (f: string) => n(Number(inv[f]) - Number(cn[f]));
    return {
      month, year,
      invoices: Number(inv.count), creditNotes: Number(cn.count),
      grossSales: n(inv.total), creditNoteValue: n(cn.total),
      taxable: net('taxable'), cgst: net('cgst'), sgst: net('sgst'), igst: net('igst'),
      totalSales: net('total'), netGstPayable: n(net('cgst') + net('sgst') + net('igst')),
    };
  }

  async listInvoices(month: number, year: number) {
    const [from, to] = this.monthRange(month, year);
    return this.invoiceRepo.createQueryBuilder('i')
      .where(`((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') >= :from AND ((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') < :to`, { from, to })
      .orderBy('i.number', 'DESC')
      .take(500)
      .getMany();
  }

  async tallyCsv(month: number, year: number): Promise<{ filename: string; csv: string }> {
    const [from, to] = this.monthRange(month, year);
    const list = await this.invoiceRepo.createQueryBuilder('i')
      .where(`((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') >= :from AND ((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') < :to`, { from, to })
      .orderBy('i.createdAt', 'ASC')
      .getMany();
    const head = ['Date', 'Voucher Type', 'Voucher No', 'Against Invoice', 'Party Name', 'Party GSTIN', 'Place of Supply', 'HSN', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total'];
    const lines = list.map(i => [
      fmtDate(i.createdAt), i.kind === 'invoice' ? 'Sales' : 'Credit Note', i.number, i.originalInvoiceNumber || '',
      i.buyerName || '', i.buyerGstin || '', `${i.placeOfSupplyCode || ''}-${GST_STATES[i.placeOfSupplyCode] || ''}`, HSN_LAPTOP,
      i.taxable, i.cgst, i.sgst, i.igst, i.total,
    ].map(csvCell).join(','));
    return { filename: `dbuggs-gst-${year}-${String(month).padStart(2, '0')}.csv`, csv: [head.join(','), ...lines].join('\n') };
  }
}
