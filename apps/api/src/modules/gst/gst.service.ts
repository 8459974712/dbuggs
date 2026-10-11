import { Injectable } from '@nestjs/common';

const GST_RATE = 0.18;
const CGST_RATE = 0.09;
const SGST_RATE = 0.09;
const HSN_CODE = '8471';

@Injectable()
export class GstService {
  calculateGst(amount: number): { base: number; cgst: number; sgst: number; total: number } {
    const base = Math.round(amount / (1 + GST_RATE));
    const cgst = Math.round(base * CGST_RATE);
    const sgst = Math.round(base * SGST_RATE);
    return { base, cgst, sgst, total: amount };
  }

  async generateInvoice(orderId: string): Promise<{ invoiceNumber: string; pdfUrl: string }> {
    const invoiceNumber = `DBG-INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    // TODO: Generate PDF invoice and upload to S3
    return {
      invoiceNumber,
      pdfUrl: `https://s3.ap-south-1.amazonaws.com/dbugg-docs-prod/invoices/${invoiceNumber}.pdf`,
    };
  }

  async generateCreditNote(orderId: string, refundAmount: number): Promise<{ creditNoteNumber: string }> {
    const creditNoteNumber = `DBG-CN-${Date.now()}`;
    // TODO: Generate credit note PDF
    return { creditNoteNumber };
  }

  async getMonthlySummary(month: number, year: number): Promise<any> {
    // TODO: Query orders and aggregate GST
    return {
      month, year,
      totalSales: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      creditNotes: 0,
      netGstPayable: 0,
    };
  }

  async exportForTally(month: number, year: number): Promise<{ downloadUrl: string }> {
    // TODO: Generate Tally-compatible XML/CSV export
    return { downloadUrl: `https://s3.ap-south-1.amazonaws.com/dbugg-docs-prod/tally/${year}-${month}.csv` };
  }
}
