import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

const ALL_ENTITIES = [
  User, Product, ProductPrice, Supplier, PurchaseOrder,
  InventoryBatch, InventoryMovement, MediaAsset, Customer,
  SalesOrder, CommissionRecord, PaymentAccount, PaymentTransaction,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature(ALL_ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class GlobalRepositoryModule {}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as any) || 'mysql',
      ...(process.env.DB_TYPE === 'better-sqlite3' || !process.env.DB_TYPE
        ? { database: process.env.DB_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : 'erp.db') }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT || 3306),
            username: process.env.DB_USER || 'erp_user',
            password: process.env.DB_PASS || 'erp_pass_2026',
            database: process.env.DB_NAME || 'fengshengda_erp',
            charset: 'utf8mb4',
            timezone: '+08:00',
          }),
      entities: ALL_ENTITIES,
      synchronize: true,        // 演示版：自动建表；生产请用 migrations
      logging: ['error', 'warn'],
    }),
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
  ],
})
export class AppModule {}
