import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentsService } from '../documents/documents.service';
import { sendPdf } from '../../common/send-file';
import { SubmitQcDto } from './qc.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService, private readonly documents: DocumentsService) {}

  @Post()
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

  @Get('serial/:serialNo')
  @ApiOperation({ summary: 'Find unit by serial number' })
  findBySerial(@Param('serialNo') serialNo: string) {
    return this.inventoryService.findBySerial(serialNo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get laptop unit by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/qc')
  @ApiOperation({ summary: 'QC history for a unit' })
  qcHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.qcHistory(id);
  }

  @Get(':id/qc-report.pdf')
  @ApiOperation({ summary: 'QC report PDF (internal, includes notes)' })
  async qcReport(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    sendPdf(res, await this.documents.qcReportPdf(id, true));
  }

  @Post(':id/qc')
  @ApiOperation({ summary: 'Submit QC checklist for a unit (optionally grade it)' })
  submitQc(@Request() req, @Param('id', ParseUUIDPipe) laptopId: string, @Body() dto: SubmitQcDto) {
    return this.inventoryService.submitQc(laptopId, dto, req.user.id);
  }

  @Put(':id/grade')
  @ApiOperation({ summary: 'Assign grade to a unit' })
  assignGrade(@Param('id', ParseUUIDPipe) laptopId: string, @Body() body: { grade: string; notes?: string }) {
    return this.inventoryService.assignGrade(laptopId, body.grade, body.notes);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update unit status' })
  updateStatus(@Param('id', ParseUUIDPipe) laptopId: string, @Body('status') status: string) {
    return this.inventoryService.updateStatus(laptopId, status);
  }
}
