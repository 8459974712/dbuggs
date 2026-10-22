import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      if (req.originalUrl?.startsWith('/payments/webhook')) req.rawBody = buf;
    },
  }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('dbuggs API')
    .setDescription('dbuggs Refurbished Laptop Commerce Platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'OTP Login & JWT')
    .addTag('users', 'User Profiles')
    .addTag('inventory', 'Inventory & QC')
    .addTag('products', 'Product Catalogue')
    .addTag('orders', 'B2C Orders')
    .addTag('b2b', 'B2B Wholesale')
    .addTag('rental', 'Rental, KYC & Deposits')
    .addTag('dealer', 'Dealer Management')
    .addTag('payments', 'Razorpay Payments')
    .addTag('gst', 'GST Invoices')
    .addTag('admin', 'Admin Panel')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`dbuggs API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
