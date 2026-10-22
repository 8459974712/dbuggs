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
  @ApiOperation({ summary: 'Checkout cart: server prices items, reserves stock, starts COD or Razorpay payment' })
  checkout(@Request() req, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(req.user, dto);
  }

  @Post('checkout/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify Razorpay payment and confirm checkout orders' })
  verifyCheckout(@Request() req, @Body() dto: VerifyCheckoutDto) {
    return this.ordersService.verifyCheckout(req.user.id, dto);
  }

  @Post('checkout/:ref/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel an unpaid online checkout and release stock' })
  cancelCheckout(@Request() req, @Param('ref') ref: string) {
    return this.ordersService.cancelCheckout(req.user.id, ref);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: create an order manually' })
  create(@Request() req, @Body() body: any) {
    return this.ordersService.create({ ...body, userId: body.userId || req.user.id });
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  findMy(@Request() req, @Query() query: any) {
    return this.ordersService.findByUser(req.user.id, query);
  }

  @Get('admin/all')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: list all orders' })
  findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail (owner or admin)' })
  findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneFor(req.user, id);
  }

  @Put(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: update order status' })
  updateStatus(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status, req.user.id);
  }

  @Get(':id/invoice.pdf')
  @ApiOperation({ summary: 'Download GST tax invoice (owner or admin)' })
  async invoice(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.ordersService.findOneFor(req.user, id);
    sendPdf(res, await this.documents.invoicePdf(id, 'invoice'));
  }

  @Get(':id/credit-note.pdf')
  @ApiOperation({ summary: 'Download GST credit note for a cancelled/returned order (owner or admin)' })
  async creditNote(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.ordersService.findOneFor(req.user, id);
    sendPdf(res, await this.documents.invoicePdf(id, 'credit_note'));
  }

  @Get(':id/warranty-card.pdf')
  @ApiOperation({ summary: 'Download warranty card (owner or admin)' })
  async warrantyCard(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.ordersService.findOneFor(req.user, id);
    sendPdf(res, await this.documents.warrantyCardPdf(id));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel my unpaid or COD order' })
  cancel(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelByCustomer(req.user, id);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Request return for my order' })
  requestReturn(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string) {
    return this.ordersService.requestReturn(req.user, id, reason);
  }

  @Post(':id/warranty')
  @ApiOperation({ summary: 'Raise warranty claim on my order' })
  raiseWarranty(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.ordersService.raiseWarranty(req.user, id, body);
  }
}
