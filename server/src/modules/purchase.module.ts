// PurchaseModule
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentAccount } from '../entities/payment-account.entity';
import { Supplier } from '../entities/supplier.entity';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, InventoryBatch, InventoryMovement, PaymentTransaction, PaymentAccount, Supplier])],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
