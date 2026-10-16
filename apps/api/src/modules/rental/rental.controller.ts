import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RentalService } from './rental.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('rental')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rental')
export class RentalController {
  constructor(private readonly rentalService: RentalService) {}

  // KYC
  @Post('kyc/submit')
  @ApiOperation({ summary: 'Submit KYC documents for rental' })
  submitKyc(@Request() req, @Body() body: any) {
    return this.rentalService.submitKyc(req.user.id, body);
  }

  @Put('kyc/:id/approve')
  @ApiOperation({ summary: 'Admin: approve KYC' })
  approveKyc(@Param('id') id: string, @Request() req) {
    return this.rentalService.approveKyc(id, req.user.id);
  }

  @Put('kyc/:id/reject')
  @ApiOperation({ summary: 'Admin: reject KYC' })
  rejectKyc(@Param('id') id: string, @Body('reason') reason: string) {
    return this.rentalService.rejectKyc(id, reason);
  }

  @Get('kyc/queue')
  @ApiOperation({ summary: 'Admin: KYC approval queue' })
  kycQueue() {
    return this.rentalService.getKycQueue();
  }

  @Get('kyc/status')
  @ApiOperation({ summary: 'Get my KYC verification status' })
  kycStatus(@Request() req) {
    return this.rentalService.getUserKycStatus(req.user.id);
  }

  @Get('admin/all-kyc')
  @ApiOperation({ summary: 'Admin: all KYC documents by status' })
  allKyc(@Query('status') status?: string) {
    return this.rentalService.getAllKycByStatus(status);
  }

  // Rental booking
  @Post('book')
  @ApiOperation({ summary: 'Book a rental after KYC approval' })
  book(@Request() req, @Body() body: any) {
    return this.rentalService.book(req.user.id, body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my rentals' })
  myRentals(@Request() req) {
    return this.rentalService.findByUser(req.user.id);
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin: all rentals' })
  allRentals() {
    return this.rentalService.findAll();
  }

  // Deposit
  @Post(':id/deposit')
  @ApiOperation({ summary: 'Record deposit payment' })
  recordDeposit(@Param('id') id: string, @Body() body: any) {
    return this.rentalService.recordDeposit(id, body);
  }

  // Autopay
  @Post(':id/autopay/setup')
  @ApiOperation({ summary: 'Setup UPI autopay / e-NACH' })
  setupAutopay(@Param('id') id: string, @Body() body: any) {
    return this.rentalService.setupAutopay(id, body);
  }

  // Return
  @Post(':id/return')
  @ApiOperation({ summary: 'Request laptop return' })
  requestReturn(@Param('id') id: string) {
    return this.rentalService.requestReturn(id);
  }

  @Post(':id/extend')
  @ApiOperation({ summary: 'Extend rental period' })
  extend(@Param('id') id: string, @Body('months') months: number) {
    return this.rentalService.extend(id, months);
  }
}
