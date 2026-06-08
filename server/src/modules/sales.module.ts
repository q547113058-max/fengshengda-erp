// SalesModule — 组装 controller + service
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesOrder } from '../entities/sales-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { CommissionRecord } from '../entities/commission-record.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Customer } from '../entities/customer.entity';
import { User } from '../entities/user.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, InventoryBatch, InventoryMovement, CommissionRecord, PaymentTransaction, Customer, User])],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
