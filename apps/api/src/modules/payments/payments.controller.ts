import { Controller, Get, Post, Body, Headers, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Public: which payment methods are enabled' })
  publicConfig() {
    return this.paymentsService.getPublicConfig();
  }

  @Post('create-order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Razorpay order' })
  createOrder(@Body() body: { amount: number; entityId: string; entityType: string }) {
    return this.paymentsService.createOrder(body.amount, body.entityId, body.entityType);
  }

  @Post('verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify payment signature' })
  verify(@Body() body: any) {
    return this.paymentsService.verifyPayment(body);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook (signed with RAZORPAY_WEBHOOK_SECRET)' })
  webhook(@Req() req: any, @Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return this.paymentsService.handleWebhook(req.rawBody, body, signature);
  }

  @Post('refund')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Admin: initiate refund' })
  refund(@Body() body: { paymentId: string; amount: number }) {
    return this.paymentsService.refund(body.paymentId, body.amount);
  }
}
