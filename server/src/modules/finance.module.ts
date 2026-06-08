// FinanceModule
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAccount } from '../entities/payment-account.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentAccount, PaymentTransaction, PurchaseOrder, SalesOrder])],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
