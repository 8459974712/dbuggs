import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { Order } from '../../database/entities/order.entity';
import { Laptop } from '../../database/entities/laptop.entity';
import { User } from '../../database/entities/user.entity';
import { B2bBuyer } from '../../database/entities/b2b-buyer.entity';
import { LaptopQc } from '../../database/entities/laptop-qc.entity';
import { PdfService } from './pdf.service';
import { DocumentsService } from './documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Order, Laptop, User, B2bBuyer, LaptopQc])],
  providers: [PdfService, DocumentsService],
  exports: [PdfService, DocumentsService],
})
export class DocumentsModule {}
