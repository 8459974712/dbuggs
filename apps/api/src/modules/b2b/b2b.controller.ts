import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, Res, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { B2bService } from './b2b.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { sendPdf } from '../../common/send-file';
import {
  ApproveB2bDto, BulkMatchDto, CreateRfqDto, QuoteRfqDto, RecordPaymentDto, RegisterB2bDto, VerifyGstinDto,
} from './b2b.dto';

@ApiTags('b2b')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register / update my B2B buyer application (GSTIN validated)' })
  register(@Request() req, @Body() dto: RegisterB2bDto) {
    return this.b2bService.register(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my B2B buyer profile/status' })
  myProfile(@Request() req) {
    return this.b2bService.findByUser(req.user.id);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'My credit ledger and GST summary' })
  myLedger(@Request() req) {
    return this.b2bService.myLedger(req.user.id);
  }

  @Post('verify-gstin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate GSTIN format, state code and check digit' })
  verifyGstin(@Body() dto: VerifyGstinDto) {
    return this.b2bService.verifyGstin(dto.gstin);
  }

  @Get('slabs')
  @ApiOperation({ summary: 'Get wholesale price slabs' })
  getSlabs() {
    return this.b2bService.getSlabs();
  }

  @Post('bulk-match')
  @HttpCode(200)
  @Roles('b2b', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Match a bulk order list (brand / model / grade / qty) to available units' })
  bulkMatch(@Request() req, @Body() dto: BulkMatchDto) {
    return this.b2bService.bulkMatch(req.user, dto);
  }

  @Post('rfq')
  @ApiOperation({ summary: 'Submit RFQ' })
  submitRfq(@Request() req, @Body() dto: CreateRfqDto) {
    return this.b2bService.submitRfq(req.user.id, dto);
  }

  @Get('rfq')
  @ApiOperation({ summary: 'My RFQs and quotations' })
  myRfqs(@Request() req) {
    return this.b2bService.myRfqs(req.user.id);
  }

  @Post('rfq/:id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept a quotation' })
  accept(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.b2bService.respond(req.user.id, id, true);
  }

  @Post('rfq/:id/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline a quotation' })
  decline(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.b2bService.respond(req.user.id, id, false);
  }

  @Get('rfq/:id/quotation.pdf')
  @ApiOperation({ summary: 'Download quotation PDF (buyer or admin)' })
  async quotationPdf(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    sendPdf(res, await this.b2bService.quotationPdf(req.user, id));
  }

  @Put('rfq/:id/quote')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: price an RFQ and issue the quotation' })
  quote(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: QuoteRfqDto) {
    return this.b2bService.quote(id, dto, req.user.id);
  }

  @Get('admin/pending')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: pending B2B applications' })
  pending() {
    return this.b2bService.getPending();
  }

  @Get('admin/buyers')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: all B2B buyers with credit position' })
  buyers() {
    return this.b2bService.listBuyers();
  }

  @Get('admin/rfqs')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: all RFQs' })
  adminRfqs(@Query('status') status?: string) {
    return this.b2bService.adminRfqs(status);
  }

  @Get('admin/:buyerId/ledger')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: buyer credit ledger' })
  buyerLedger(@Param('buyerId', ParseUUIDPipe) buyerId: string) {
    return this.b2bService.ledger(buyerId);
  }

  @Post('admin/:buyerId/payment')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: record a payment received against credit' })
  recordPayment(@Request() req, @Param('buyerId', ParseUUIDPipe) buyerId: string, @Body() dto: RecordPaymentDto) {
    return this.b2bService.recordPayment(buyerId, dto, req.user.id);
  }

  @Put(':id/approve')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: approve B2B buyer and set credit limit' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveB2bDto, @Request() req) {
    return this.b2bService.approve(id, dto.creditLimit, req.user.id);
  }

  @Put(':id/reject')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: reject B2B buyer' })
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.b2bService.reject(id);
  }
}
