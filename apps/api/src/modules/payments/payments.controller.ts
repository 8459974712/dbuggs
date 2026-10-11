import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
  @ApiOperation({ summary: 'Razorpay webhook (no auth)' })
  webhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return this.paymentsService.handleWebhook(body, signature);
  }

  @Post('refund')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate refund' })
  refund(@Body() body: { paymentId: string; amount: number }) {
    return this.paymentsService.refund(body.paymentId, body.amount);
  }
}
