import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
import { B2bBuyer } from '../../database/entities/b2b-buyer.entity';
import { B2bLedgerEntry } from '../../database/entities/b2b-ledger.entity';
import { Rfq } from '../../database/entities/rfq.entity';
import { User } from '../../database/entities/user.entity';
import { Laptop } from '../../database/entities/laptop.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [TypeOrmModule.forFeature([B2bBuyer, B2bLedgerEntry, Rfq, User, Laptop]), DocumentsModule],
  controllers: [B2bController],
  providers: [B2bService],
  exports: [B2bService],
})
export class B2bModule {}
