import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all available products' })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail with QC report' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get('rental/plans')
  @ApiOperation({ summary: 'Get available rental laptops and plans' })
  rentalProducts() {
    return this.productsService.getRentalProducts();
  }
}
