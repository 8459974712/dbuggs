import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  create(@Request() req, @Body() body: any) {
    return this.ordersService.create({ ...body, userId: req.user.id });
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  findMy(@Request() req, @Query() query: any) {
    return this.ordersService.findByUser(req.user.id, query);
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin: list all orders' })
  findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Request return for an order' })
  requestReturn(@Param('id') id: string, @Body('reason') reason: string) {
    return this.ordersService.requestReturn(id, reason);
  }

  @Post(':id/warranty')
  @ApiOperation({ summary: 'Raise warranty claim' })
  raiseWarranty(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.raiseWarranty(id, body);
  }
}
