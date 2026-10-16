import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RentalService } from './rental.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('rentals')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalService: RentalService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create rental from checkout (with inline KYC)' })
  async createRental(@Request() req, @Body() body: any) {
    return this.rentalService.createFromCheckout(req.user.id, body);
  }
}
