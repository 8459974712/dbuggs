import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealerController } from './dealer.controller';
import { DealerService } from './dealer.service';
import { Dealer } from '../../database/entities/dealer.entity';
import { Commission } from '../../database/entities/commission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dealer, Commission])],
  controllers: [DealerController],
  providers: [DealerService],
  exports: [DealerService],
})
export class DealerModule {}
