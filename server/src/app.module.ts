import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { buildTypeOrmConfig, buildJwtSecret, ALL_ENTITIES } from './config.factory';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './common/jwt-auth.guard';

import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { ProductPrice } from './entities/product-price.entity';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { Customer } from './entities/customer.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { CommissionRecord } from './entities/commission-record.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { OrderSequence } from './entities/order-sequence.entity';

import { AuthModule } from './modules/auth.module';
import { ProductsModule } from './modules/products.module';
import { SuppliersModule } from './modules/suppliers.module';
import { PurchaseModule } from './modules/purchase.module';
import { InventoryModule } from './modules/inventory.module';
import { MediaModule } from './modules/media.module';
import { CustomersModule } from './modules/customers.module';
import { SalesModule } from './modules/sales.module';
import { CommissionModule } from './modules/commission.module';
import { FinanceModule } from './modules/finance.module';
import { DashboardModule } from './modules/dashboard.module';
import { UsersModule } from './modules/users.module';
import { SeedModule } from './modules/seed.module';
import { HealthModule } from './modules/health.module';
import { LoggingModule } from './common/logging.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature(ALL_ENTITIES),
    JwtModule.register({
      secret: buildJwtSecret(),
      signOptions: { expiresIn: '8h' },
    }),
  ],
  exports: [TypeOrmModule, JwtModule],
})
export class GlobalRepositoryModule {}

@Module({
  imports: [
    TypeOrmModule.forRoot(buildTypeOrmConfig()),
    // 限流：默认 100 req/min（演示环境 + 防暴力不太严；生产可调）
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    GlobalRepositoryModule,
    AuthModule,
    ProductsModule,
    SuppliersModule,
    PurchaseModule,
    InventoryModule,
    MediaModule,
    CustomersModule,
    SalesModule,
    CommissionModule,
    FinanceModule,
    DashboardModule,
    UsersModule,
    SeedModule,
    HealthModule,
    LoggingModule,
  ],
  providers: [
    // 全局 JWT 鉴权（端点可 @Public() 跳过）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 全局限流（公开端点如 /health 不限流可在端点 @SkipThrottle）
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
