import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Order } from '../../database/entities/order.entity';
import { Laptop } from '../../database/entities/laptop.entity';
import { Rental } from '../../database/entities/rental.entity';
import { KycDocument } from '../../database/entities/kyc-document.entity';
import { Dealer } from '../../database/entities/dealer.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Order, Laptop, Rental, KycDocument, Dealer, RolePermission, User])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
