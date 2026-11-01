import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly svc: IntegrationService) {}

  // ── Razorpay Payouts (#104) ──
  @Post('payout')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Initiate Razorpay payout' })
  initiatePayout(@Body() body: any) {
    return this.svc.initiatePayout(body.dealerId, body.amount, body.bankDetails);
  }

  @Get('payout/:id/status')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Check payout status' })
  payoutStatus(@Param('id') id: string) {
    return this.svc.getPayoutStatus(id);
  }

  // ── E-way Bill & Tally (#105) ──
  @Post('eway-bill/:orderId')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Generate e-way bill for order' })
  generateEwayBill(@Param('orderId') orderId: string) {
    return this.svc.generateEwayBill(orderId);
  }

  @Get('tally-export')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Export data for Tally' })
  exportTally(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.svc.exportTally(startDate || '2026-01-01', endDate || '2026-12-31');
  }

  // ── WhatsApp Alerts (#106) ──
  @Post('whatsapp/send')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send WhatsApp message' })
  sendWhatsApp(@Body() body: any) {
    return this.svc.sendWhatsApp(body.phone, body.template, body.params || {});
  }

  @Post('whatsapp/order/:orderId')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send order WhatsApp alert' })
  sendOrderWhatsApp(@Param('orderId') orderId: string, @Body('event') event: string) {
    return this.svc.sendOrderWhatsApp(orderId, event);
  }

  // ── SMS & Email (#107) ──
  @Post('sms/send')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send SMS' })
  sendSMS(@Body() body: any) {
    return this.svc.sendSMS(body.phone, body.message);
  }

  @Post('email/send')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send email' })
  sendEmail(@Body() body: any) {
    return this.svc.sendEmail(body.to, body.subject, body.html);
  }

  @Post('alerts/order/:orderId')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send all alerts (WhatsApp + SMS + Email) for order event' })
  sendOrderAlerts(@Param('orderId') orderId: string, @Body('event') event: string) {
    return this.svc.sendOrderAlerts(orderId, event);
  }

  // ── Shiprocket (#108) ──
  @Post('shipping/create/:orderId')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create shipment via Shiprocket' })
  createShipment(@Param('orderId') orderId: string, @Body() body: any) {
    return this.svc.createShipment(orderId, body.address);
  }

  @Get('shipping/track/:awb')
  @ApiOperation({ summary: 'Track shipment' })
  trackShipment(@Param('awb') awb: string) {
    return this.svc.trackShipment(awb);
  }

  @Get('shipping/rates')
  @ApiOperation({ summary: 'Get shipping rates' })
  getShippingRates(@Query('pincode') pincode: string, @Query('weight') weight: string) {
    return this.svc.getShippingRates(pincode || '110001', Number(weight) || 2);
  }

  // ── Profit Analytics (#113) ──
  @Get('analytics/profit')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Profit analytics' })
  profitAnalytics(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.svc.getProfitAnalytics(startDate, endDate);
  }

  @Get('analytics/approval-limits')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get role-based approval limits' })
  approvalLimits() {
    return this.svc.getApprovalLimits();
  }

  // ── Agreement E-sign (#80) ──
  @Post('agreement/generate')
  @ApiOperation({ summary: 'Generate dealer agreement' })
  generateAgreement(@Body() body: any) {
    return this.svc.generateAgreement(body.dealerId, body.dealerName);
  }

  @Post('agreement/sign')
  @ApiOperation({ summary: 'E-sign agreement with OTP' })
  signAgreement(@Body() body: any) {
    return this.svc.signAgreement(body.agreementId, body.otp);
  }

  // ── Share Offers on WhatsApp (#95) ──
  @Post('share-offer')
  @ApiOperation({ summary: 'Share product offer on WhatsApp' })
  shareOffer(@Body() body: any) {
    return this.svc.shareOfferOnWhatsApp(body.phone, body.productId, body.productName, body.price, body.imageUrl);
  }

  // ── Marketing Kit (#99) ──
  @Get('marketing-kit')
  @ApiOperation({ summary: 'Get marketing kit assets' })
  marketingKit() {
    return this.svc.getMarketingKit();
  }
}
