import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from '../seed.service';

import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { Supplier } from '../entities/supplier.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { MediaAsset } from '../entities/media-asset.entity';
import { Customer } from '../entities/customer.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { CommissionRecord } from '../entities/commission-record.entity';
import { PaymentAccount } from '../entities/payment-account.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    User, Product, ProductPrice, Supplier, PurchaseOrder,
    InventoryBatch, InventoryMovement, MediaAsset, Customer,
    SalesOrder, CommissionRecord, PaymentAccount, PaymentTransaction,
  ])],
  providers: [SeedService],
})
export class SeedModule {}
