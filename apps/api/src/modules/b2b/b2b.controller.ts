import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { B2bService } from './b2b.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('b2b')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register as B2B buyer' })
  register(@Request() req, @Body() body: any) {
    return this.b2bService.register(req.user.id, body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my B2B buyer profile/status' })
  myProfile(@Request() req) {
    return this.b2bService.findByUser(req.user.id);
  }

  @Get('admin/pending')
  @ApiOperation({ summary: 'Admin: pending B2B applications' })
  pending() {
    return this.b2bService.getPending();
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Admin: approve B2B buyer' })
  approve(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.b2bService.approve(id, body.creditLimit, req.user.id);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Admin: reject B2B buyer' })
  reject(@Param('id') id: string) {
    return this.b2bService.reject(id);
  }

  @Post('verify-gstin')
  @ApiOperation({ summary: 'Verify GSTIN via govt API' })
  verifyGstin(@Body('gstin') gstin: string) {
    return this.b2bService.verifyGstin(gstin);
  }

  @Get('slabs')
  @ApiOperation({ summary: 'Get wholesale price slabs' })
  getSlabs() {
    return this.b2bService.getSlabs();
  }

  @Post('rfq')
  @ApiOperation({ summary: 'Submit RFQ' })
  submitRfq(@Request() req, @Body() body: any) {
    return this.b2bService.submitRfq(req.user.id, body);
  }

  @Post('rfq/:id/quotation')
  @ApiOperation({ summary: 'Admin: generate PDF quotation for RFQ' })
  generateQuotation(@Param('id') rfqId: string) {
    return this.b2bService.generateQuotation(rfqId);
  }
}
