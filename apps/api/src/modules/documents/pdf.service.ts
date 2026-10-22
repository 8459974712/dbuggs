import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GST_STATES } from '../../common/india';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

export interface Seller {
  name: string;
  legalName: string;
  gstin: string;
  address: string;
  stateCode: string;
  phone: string;
  email: string;
}

export interface Column {
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

const NAVY = '#1C2B6B';
const ORANGE = '#F07830';
const GREY = '#6B7280';
const LINE = '#E5E7EB';

export function inr(n: number | string): string {
  const v = Number(n) || 0;
  return 'Rs. ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

@Injectable()
export class PdfService {
  constructor(private config: ConfigService) {}

  seller(): Seller {
    const c = (k: string, d = '') => (this.config.get<string>(k) || d).trim();
    return {
      name: c('SELLER_NAME', 'dbuggs'),
      legalName: c('SELLER_LEGAL_NAME', 'dbuggs'),
      gstin: c('SELLER_GSTIN'),
      address: c('SELLER_ADDRESS'),
      stateCode: c('SELLER_STATE_CODE', '36'),
      phone: c('SELLER_PHONE'),
      email: c('SELLER_EMAIL'),
    };
  }

  render(build: (doc: any) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Producer: 'dbuggs', Creator: 'dbuggs' } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        build(doc);
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.page.margins.bottom = 0;
          doc.fontSize(7.5).fillColor(GREY).text(
            `Page ${i - range.start + 1} of ${range.count}  ·  This is a computer-generated document.`,
            40, doc.page.height - 30, { width: doc.page.width - 80, align: 'center', lineBreak: false },
          );
        }
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  header(doc: any, title: string, meta: [string, string][]) {
    const s = this.seller();
    const left = 40;
    const width = doc.page.width - 80;
    doc.rect(0, 0, doc.page.width, 6).fill(ORANGE);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text('d', left, 28, { continued: true })
      .fillColor(ORANGE).text('bugg', { continued: true }).fillColor(NAVY).text('s');
    doc.font('Helvetica').fontSize(8.5).fillColor(GREY);
    const sellerLines = [
      s.legalName !== s.name ? s.legalName : '',
      s.address,
      `GSTIN: ${s.gstin || 'Not configured'}  ·  State: ${GST_STATES[s.stateCode] || s.stateCode} (${s.stateCode})`,
      [s.phone, s.email].filter(Boolean).join('  ·  '),
    ].filter(Boolean);
    doc.text(sellerLines.join('\n'), left, 54, { width: width * 0.55 });

    doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY).text(title, left + width * 0.55, 30, { width: width * 0.45, align: 'right' });
    let y = 52;
    doc.fontSize(8.5);
    for (const [k, v] of meta) {
      doc.font('Helvetica').fillColor(GREY).text(k, left + width * 0.55, y, { width: width * 0.2, align: 'right' });
      doc.font('Helvetica-Bold').fillColor('#111827').text(v, left + width * 0.75, y, { width: width * 0.25, align: 'right' });
      y += 13;
    }
    const bottom = Math.max(doc.y, y) + 10;
    doc.moveTo(left, bottom).lineTo(left + width, bottom).lineWidth(1).strokeColor(LINE).stroke();
    doc.y = bottom + 12;
  }

  partyBlocks(doc: any, blocks: { title: string; lines: string[] }[]) {
    const left = 40;
    const width = doc.page.width - 80;
    const colW = (width - 16 * (blocks.length - 1)) / blocks.length;
    const top = doc.y;
    let maxY = top;
    blocks.forEach((b, i) => {
      const x = left + i * (colW + 16);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(ORANGE).text(b.title.toUpperCase(), x, top, { width: colW, characterSpacing: 0.6 });
      doc.font('Helvetica').fontSize(9.5).fillColor('#111827').text(b.lines.filter(Boolean).join('\n'), x, top + 13, { width: colW, lineGap: 1.5 });
      maxY = Math.max(maxY, doc.y);
    });
    doc.y = maxY + 14;
  }

  table(doc: any, cols: Column[], rows: string[][]) {
    const left = 40;
    const width = doc.page.width - 80;
    const total = cols.reduce((s, c) => s + c.width, 0);
    const widths = cols.map(c => (c.width / total) * width);
    const pad = 5;
    const drawHead = () => {
      const y = doc.y;
      doc.rect(left, y, width, 20).fill(NAVY);
      let x = left;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      cols.forEach((c, i) => {
        doc.text(c.label, x + pad, y + 6, { width: widths[i] - pad * 2, align: c.align || 'left', lineBreak: false });
        x += widths[i];
      });
      doc.y = y + 20;
    };
    drawHead();
    rows.forEach((r, ri) => {
      doc.font('Helvetica').fontSize(8.5);
      const h = Math.max(18, ...r.map((cell, i) => doc.heightOfString(cell || '', { width: widths[i] - pad * 2 }) + 10));
      if (doc.y + h > doc.page.height - 60) { doc.addPage(); doc.y = 40; drawHead(); }
      const y = doc.y;
      if (ri % 2 === 1) doc.rect(left, y, width, h).fill('#F7F8FC');
      let x = left;
      doc.fillColor('#111827');
      r.forEach((cell, i) => {
        doc.text(cell || '', x + pad, y + 5, { width: widths[i] - pad * 2, align: cols[i].align || 'left' });
        x += widths[i];
      });
      doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.y = y + h;
    });
    doc.y += 8;
  }

  totals(doc: any, lines: [string, string, boolean?][]) {
    const width = doc.page.width - 80;
    const x = 40 + width * 0.55;
    const w = width * 0.45;
    if (doc.y + lines.length * 16 > doc.page.height - 60) { doc.addPage(); doc.y = 40; }
    for (const [k, v, strong] of lines) {
      const y = doc.y;
      if (strong) doc.rect(x, y - 3, w, 19).fill('#FEF0E6');
      doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 10.5 : 9).fillColor(strong ? NAVY : '#111827');
      doc.text(k, x + 6, y, { width: w * 0.55 - 6 });
      doc.text(v, x + w * 0.55, y, { width: w * 0.45 - 6, align: 'right' });
      doc.y = y + 16;
    }
    doc.y += 6;
  }

  note(doc: any, title: string, text: string) {
    if (doc.y > doc.page.height - 110) { doc.addPage(); doc.y = 40; }
    doc.font('Helvetica-Bold').fontSize(8).fillColor(ORANGE).text(title.toUpperCase(), 40, doc.y, { characterSpacing: 0.6 });
    doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(text, 40, doc.y + 3, { width: doc.page.width - 80, lineGap: 1.5 });
    doc.y += 10;
  }

  signature(doc: any, label: string) {
    const s = this.seller();
    const width = doc.page.width - 80;
    if (doc.y > doc.page.height - 120) { doc.addPage(); doc.y = 40; }
    const y = doc.y + 24;
    doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(`For ${s.legalName}`, 40 + width * 0.6, y, { width: width * 0.4, align: 'right' });
    doc.moveTo(40 + width * 0.7, y + 40).lineTo(40 + width, y + 40).lineWidth(0.7).strokeColor('#9CA3AF').stroke();
    doc.text(label, 40 + width * 0.6, y + 45, { width: width * 0.4, align: 'right' });
    doc.y = y + 60;
  }
}
