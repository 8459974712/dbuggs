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

  // Step 1: Create EMI application
  @Post('apply')
  @ApiOperation({ summary: 'Step 1: Create EMI application with product & plan' })
  createApplication(@Request() req, @Body() body: any) {
    return this.rentalService.createApplication(req.user.id, body);
  }

  // Step 2: Verify mobile
  @Post(':id/verify-mobile')
  @ApiOperation({ summary: 'Step 2: Verify mobile number via OTP' })
  verifyMobile(@Param('id') id: string, @Body() body: any) {
    return this.rentalService.verifyMobile(id, body);
  }

  // Step 3: PAN verification
  @Post(':id/verify-pan')
  @ApiOperation({ summary: 'Step 3: Verify PAN card number' })
  verifyPan(@Param('id') id: string, @Body('panNumber') panNumber: string) {
    return this.rentalService.verifyPan(id, panNumber);
  }

  // Step 4: KYC documents
  @Post('kyc/submit')
  @ApiOperation({ summary: 'Step 4: Submit KYC documents (Aadhaar + selfie)' })
  submitKyc(@Request() req, @Body() body: any) {
    return this.rentalService.submitKyc(req.user.id, body);
  }

  // Step 5: Income & eligibility
  @Post(':id/income')
  @ApiOperation({ summary: 'Step 5: Submit income & employment details' })
  submitIncome(@Param('id') id: string, @Body() body: any) {
    return this.rentalService.submitIncome(id, body);
  }

  // Step 6-7: Admin credit assessment
  @Put(':id/credit-assess')
  @ApiOperation({ summary: 'Admin: Credit assessment - approve/reject/review' })
  assessCredit(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.rentalService.assessCredit(id, req.user.id, body);
  }

  // Step 8: Get EMI schedule
  @Get(':id/emi-schedule')
  @ApiOperation({ summary: 'Get EMI schedule for a rental' })
  getEmiSchedule(@Param('id') id: string) {
    return this.rentalService.getEmiSchedule(id);
  }

  // Step 9: Accept agreement
  @Post(':id/accept-agreement')
  @ApiOperation({ summary: 'Step 9: Accept agreement & move to deposit' })
  acceptAgreement(@Param('id') id: string) {
    return this.rentalService.acceptAgreement(id);
  }

  // KYC admin
  @Put('kyc/:id/approve')
  @ApiOperation({ summary: 'Admin: approve KYC document' })
  approveKyc(@Param('id') id: string, @Request() req) {
    return this.rentalService.approveKyc(id, req.user.id);
  }

  @Put('kyc/:id/reject')
  @ApiOperation({ summary: 'Admin: reject KYC document' })
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

  // Credit queue for admin
  @Get('admin/credit-queue')
  @ApiOperation({ summary: 'Admin: applications pending credit assessment' })
  creditQueue() {
    return this.rentalService.getCreditQueue();
  }

  // All applications for admin
  @Get('admin/applications')
  @ApiOperation({ summary: 'Admin: all EMI applications' })
  allApplications(@Query('status') status?: string) {
    return this.rentalService.getAllApplications(status);
  }

  // Rental booking (legacy)
  @Post('book')
  @ApiOperation({ summary: 'Book a rental after KYC approval' })
  book(@Request() req, @Body() body: any) {
    return this.rentalService.book(req.user.id, body);
  }

  // Full checkout flow
  @Post('checkout')
  @ApiOperation({ summary: 'Full checkout: product + KYC + income in one step' })
  checkout(@Request() req, @Body() body: any) {
    return this.rentalService.createFromCheckout(req.user.id, body);
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
  @ApiOperation({ summary: 'Record deposit payment & activate rental' })
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
