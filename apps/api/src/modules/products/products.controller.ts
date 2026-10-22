import { Controller, Get, Param, Query, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { DocumentsService } from '../documents/documents.service';
import { sendPdf } from '../../common/send-file';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService, private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all available products (public fields only)' })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('rental/plans')
  @ApiOperation({ summary: 'Get available rental laptops and plans' })
  rentalProducts() {
    return this.productsService.getRentalProducts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/qc-report.pdf')
  @ApiOperation({ summary: 'Public QC inspection report for a listed unit' })
  async qcReport(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.productsService.findOne(id);
    sendPdf(res, await this.documents.qcReportPdf(id, false));
  }
}
