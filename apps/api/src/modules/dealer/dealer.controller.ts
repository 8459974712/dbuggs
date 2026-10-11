import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DealerService } from './dealer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('dealer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dealer')
export class DealerController {
  constructor(private readonly dealerService: DealerService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register as dealer' })
  register(@Request() req, @Body() body: any) {
    return this.dealerService.register(req.user.id, body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my dealer profile' })
  myProfile(@Request() req) {
    return this.dealerService.findByUser(req.user.id);
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin: list all dealers' })
  findAll() {
    return this.dealerService.findAll();
  }

  @Get('admin/applications')
  @ApiOperation({ summary: 'Admin: pending dealer applications' })
  applications() {
    return this.dealerService.getPendingApplications();
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Admin: approve dealer' })
  approve(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.dealerService.approve(id, body.tier, req.user.id);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Admin: reject dealer' })
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.dealerService.reject(id, reason);
  }

  @Get(':id/commission')
  @ApiOperation({ summary: 'Get dealer commission history' })
  commission(@Param('id') id: string) {
    return this.dealerService.getCommissions(id);
  }

  @Post(':id/payout')
  @ApiOperation({ summary: 'Request commission payout' })
  payout(@Param('id') id: string, @Body('amount') amount: number) {
    return this.dealerService.requestPayout(id, amount);
  }
}
