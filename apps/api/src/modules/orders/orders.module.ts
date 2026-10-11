import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../../database/entities/order.entity';
import { Laptop } from '../../database/entities/laptop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Laptop])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
