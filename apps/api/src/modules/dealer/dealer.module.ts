import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealerController } from './dealer.controller';
import { DealerService } from './dealer.service';
import { Dealer } from '../../database/entities/dealer.entity';
import { Commission } from '../../database/entities/commission.entity';
import { DealerStockOrder } from '../../database/entities/dealer-stock-order.entity';
import { DealerSale } from '../../database/entities/dealer-sale.entity';
import { DealerLead } from '../../database/entities/dealer-lead.entity';
import { DealerTarget } from '../../database/entities/dealer-target.entity';
import { Laptop } from '../../database/entities/laptop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dealer, Commission, DealerStockOrder, DealerSale, DealerLead, DealerTarget, Laptop])],
  controllers: [DealerController],
  providers: [DealerService],
  exports: [DealerService],
})
export class DealerModule {}
