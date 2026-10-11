import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GstService } from './gst.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('gst')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gst')
export class GstController {
  constructor(private readonly gstService: GstService) {}

  @Post('invoice/:orderId')
  @ApiOperation({ summary: 'Generate GST invoice for order' })
  generateInvoice(@Param('orderId') orderId: string) {
    return this.gstService.generateInvoice(orderId);
  }

  @Post('credit-note/:orderId')
  @ApiOperation({ summary: 'Generate credit note for return/refund' })
  creditNote(@Param('orderId') orderId: string, @Body() body: any) {
    return this.gstService.generateCreditNote(orderId, body.refundAmount);
  }

  @Get('summary/:month/:year')
  @ApiOperation({ summary: 'Get monthly GST summary' })
  summary(@Param('month') month: string, @Param('year') year: string) {
    return this.gstService.getMonthlySummary(parseInt(month), parseInt(year));
  }

  @Get('export/tally/:month/:year')
  @ApiOperation({ summary: 'Export GST data for Tally' })
  tallyExport(@Param('month') month: string, @Param('year') year: string) {
    return this.gstService.exportForTally(parseInt(month), parseInt(year));
  }
}
