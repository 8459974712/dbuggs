import { Controller, Get, Post, Param, UseGuards, Res, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentsService } from '../documents/documents.service';
import { sendCsv } from '../../common/send-file';

@ApiTags('gst')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('gst')
export class GstController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('invoice/:orderId')
  @ApiOperation({ summary: 'Admin: generate (or fetch) the GST invoice for an order' })
  generateInvoice(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.documents.ensureInvoice(orderId);
  }

  @Post('credit-note/:orderId')
  @ApiOperation({ summary: 'Admin: generate (or fetch) the credit note for a cancelled/returned order' })
  creditNote(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.documents.ensureCreditNote(orderId);
  }

  @Get('summary/:month/:year')
  @ApiOperation({ summary: 'Admin: monthly GST summary (invoices minus credit notes)' })
  summary(@Param('month', ParseIntPipe) month: number, @Param('year', ParseIntPipe) year: number) {
    return this.documents.monthlySummary(month, year);
  }

  @Get('invoices/:month/:year')
  @ApiOperation({ summary: 'Admin: invoices and credit notes issued in a month' })
  invoices(@Param('month', ParseIntPipe) month: number, @Param('year', ParseIntPipe) year: number) {
    return this.documents.listInvoices(month, year);
  }

  @Get('export/tally/:month/:year')
  @ApiOperation({ summary: 'Admin: download month invoices & credit notes as CSV for Tally' })
  async tallyExport(@Param('month', ParseIntPipe) month: number, @Param('year', ParseIntPipe) year: number, @Res() res: Response) {
    sendCsv(res, await this.documents.tallyCsv(month, year));
  }
}
