import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Add new laptop unit (admin)' })
  addUnit(@Body() body: any) {
    return this.inventoryService.addUnit(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all inventory units' })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  findAll(@Query() query: any) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get laptop unit by ID' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get('serial/:serialNo')
  @ApiOperation({ summary: 'Find unit by serial number' })
  findBySerial(@Param('serialNo') serialNo: string) {
    return this.inventoryService.findBySerial(serialNo);
  }

  @Post(':id/qc')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Submit QC checklist for a unit' })
  submitQc(@Param('id') laptopId: string, @Body() body: any) {
    return this.inventoryService.submitQc(laptopId, body);
  }

  @Put(':id/grade')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Assign grade to a unit' })
  assignGrade(@Param('id') laptopId: string, @Body() body: { grade: string; notes?: string }) {
    return this.inventoryService.assignGrade(laptopId, body.grade, body.notes);
  }

  @Put(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update unit status' })
  updateStatus(@Param('id') laptopId: string, @Body('status') status: string) {
    return this.inventoryService.updateStatus(laptopId, status);
  }
}
