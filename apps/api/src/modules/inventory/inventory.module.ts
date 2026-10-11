import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Laptop } from '../../database/entities/laptop.entity';
import { LaptopQc } from '../../database/entities/laptop-qc.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Laptop, LaptopQc])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
