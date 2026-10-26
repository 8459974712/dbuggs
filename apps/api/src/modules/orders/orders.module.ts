import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../../database/entities/order.entity';
import { Laptop } from '../../database/entities/laptop.entity';
import { WarrantyClaim } from '../../database/entities/warranty-claim.entity';
import { TradeIn } from '../../database/entities/trade-in.entity';
import { WalletTransaction } from '../../database/entities/wallet.entity';
import { B2bModule } from '../b2b/b2b.module';
import { PaymentsModule } from '../payments/payments.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Laptop, WarrantyClaim, TradeIn, WalletTransaction]),
    B2bModule,
    PaymentsModule,
    DocumentsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
