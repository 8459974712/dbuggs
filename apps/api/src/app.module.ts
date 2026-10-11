import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { B2bModule } from './modules/b2b/b2b.module';
import { RentalModule } from './modules/rental/rental.module';
import { DealerModule } from './modules/dealer/dealer.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GstModule } from './modules/gst/gst.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: +config.get('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),

    CacheModule.register({ isGlobal: true, ttl: 300 }),

    AuthModule,
    UsersModule,
    InventoryModule,
    ProductsModule,
    OrdersModule,
    B2bModule,
    RentalModule,
    DealerModule,
    PaymentsModule,
    NotificationsModule,
    GstModule,
    AdminModule,
  ],
})
export class AppModule {}
