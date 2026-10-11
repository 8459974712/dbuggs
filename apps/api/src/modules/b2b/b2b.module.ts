import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
import { B2bBuyer } from '../../database/entities/b2b-buyer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([B2bBuyer])],
  controllers: [B2bController],
  providers: [B2bService],
  exports: [B2bService],
})
export class B2bModule {}
