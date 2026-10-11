import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalController } from './rental.controller';
import { RentalService } from './rental.service';
import { Rental } from '../../database/entities/rental.entity';
import { KycDocument } from '../../database/entities/kyc-document.entity';
import { Laptop } from '../../database/entities/laptop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rental, KycDocument, Laptop])],
  controllers: [RentalController],
  providers: [RentalService],
  exports: [RentalService],
})
export class RentalModule {}
