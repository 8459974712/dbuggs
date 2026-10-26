import { Controller, Get, Post, Param, Query, Body, Res, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { DocumentsService } from '../documents/documents.service';
import { sendPdf } from '../../common/send-file';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService, private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List available products' })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get list of all brands' })
  brands() {
    return this.productsService.getBrands();
  }

  @Get('rental/plans')
  @ApiOperation({ summary: 'Get available rental laptops and plans' })
  rentalProducts() {
    return this.productsService.getRentalProducts();
  }

  // ── #29 COMPARE ──
  @Post('compare')
  @ApiOperation({ summary: 'Compare up to 4 products side by side' })
  compare(@Body('ids') ids: string[]) {
    return this.productsService.compare(ids);
  }

  // ── #31 SEO: sitemap ──
  @Get('sitemap.xml')
  @ApiOperation({ summary: 'Product sitemap for search engines' })
  async sitemap(@Res() res: Response) {
    const xml = await this.productsService.generateSitemap();
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/qc-report.pdf')
  @ApiOperation({ summary: 'Public QC inspection report' })
  async qcReport(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.productsService.findOne(id);
    sendPdf(res, await this.documents.qcReportPdf(id, false));
  }
}
