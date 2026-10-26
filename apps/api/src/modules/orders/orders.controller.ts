import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, HttpCode, ParseUUIDPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CheckoutDto, VerifyCheckoutDto } from './checkout.dto';
import { DocumentsService } from '../documents/documents.service';
import { sendPdf } from '../../common/send-file';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService, private readonly documents: DocumentsService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout cart' })
  checkout(@Request() req, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(req.user, dto);
  }

  @Post('checkout/verify')
  @HttpCode(200)
  verifyCheckout(@Request() req, @Body() dto: VerifyCheckoutDto) {
    return this.ordersService.verifyCheckout(req.user.id, dto);
  }

  @Post('checkout/:ref/cancel')
  @HttpCode(200)
  cancelCheckout(@Request() req, @Param('ref') ref: string) {
    return this.ordersService.cancelCheckout(req.user.id, ref);
  }

  @Post()
  @Roles('admin', 'super_admin')
  create(@Request() req, @Body() body: any) {
    return this.ordersService.create({ ...body, userId: body.userId || req.user.id });
  }

  @Get()
  findMy(@Request() req, @Query() query: any) {
    return this.ordersService.findByUser(req.user.id, query);
  }

  @Get('admin/all')
  @Roles('admin', 'super_admin')
  findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneFor(req.user, id);
  }

  @Put(':id/status')
  @Roles('admin', 'super_admin')
  updateStatus(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status, req.user.id);
  }

  @Get(':id/invoice.pdf')
  async invoice(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.ordersService.findOneFor(req.user, id);
    sendPdf(res, await this.documents.invoicePdf(id, 'invoice'));
  }

  @Get(':id/credit-note.pdf')
  async creditNote(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.ordersService.findOneFor(req.user, id);
    sendPdf(res, await this.documents.invoicePdf(id, 'credit_note'));
  }

  @Get(':id/warranty-card.pdf')
  async warrantyCard(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.ordersService.findOneFor(req.user, id);
    sendPdf(res, await this.documents.warrantyCardPdf(id));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelByCustomer(req.user, id);
  }

  // ── #26 RETURNS ──
  @Post(':id/return')
  requestReturn(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string) {
    return this.ordersService.requestReturn(req.user, id, reason);
  }

  @Post(':id/return/approve')
  @Roles('admin', 'super_admin')
  approveReturn(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.approveReturn(id, req.user.id);
  }

  // ── #27 WARRANTY CLAIMS ──
  @Post(':id/warranty')
  raiseWarranty(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() body: { issue: string; description?: string }) {
    return this.ordersService.raiseWarranty(req.user, id, body);
  }

  @Get('warranty/my')
  myWarranty(@Request() req) {
    return this.ordersService.findWarrantyByUser(req.user.id);
  }

  @Get('admin/warranty')
  @Roles('admin', 'super_admin')
  allWarranty(@Query() query: any) {
    return this.ordersService.findAllWarranty(query);
  }

  @Put('admin/warranty/:id')
  @Roles('admin', 'super_admin')
  updateWarranty(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.ordersService.updateWarranty(id, body);
  }

  // ── #28 TRADE-IN ──
  @Post('trade-in')
  submitTradeIn(@Request() req, @Body() body: any) {
    return this.ordersService.submitTradeIn(req.user, body);
  }

  @Get('trade-in/my')
  myTradeIns(@Request() req) {
    return this.ordersService.findTradeInsByUser(req.user.id);
  }

  @Get('admin/trade-ins')
  @Roles('admin', 'super_admin')
  allTradeIns(@Query() query: any) {
    return this.ordersService.findAllTradeIns(query);
  }

  @Put('admin/trade-in/:id')
  @Roles('admin', 'super_admin')
  updateTradeIn(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.ordersService.updateTradeIn(id, body, req.user.id);
  }

  // ── #30 WALLET ──
  @Get('wallet/balance')
  walletBalance(@Request() req) {
    return this.ordersService.getWalletBalance(req.user.id);
  }

  @Post('admin/wallet/credit')
  @Roles('admin', 'super_admin')
  adminCredit(@Request() req, @Body() body: { userId: string; amount: number; note: string }) {
    return this.ordersService.adminCreditWallet(body.userId, body.amount, body.note, req.user.id);
  }
}
