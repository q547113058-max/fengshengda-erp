import { Module, Controller, Get } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../entities/product.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { PaymentAccount } from '../entities/payment-account.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Customer } from '../entities/customer.entity';

@Controller('dashboard')
class DashboardController {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(PurchaseOrder) private po: Repository<PurchaseOrder>,
    @InjectRepository(SalesOrder) private so: Repository<SalesOrder>,
    @InjectRepository(InventoryBatch) private batches: Repository<InventoryBatch>,
    @InjectRepository(PaymentAccount) private accounts: Repository<PaymentAccount>,
    @InjectRepository(PaymentTransaction) private tx: Repository<PaymentTransaction>,
    @InjectRepository(Customer) private customers: Repository<Customer>,
  ) {}

  @Get('kpi')
  async kpi() {
    const [products, po, so, batches, accounts, tx, customers] = await Promise.all([
      this.products.find(),
      this.po.find(),
      this.so.find(),
      this.batches.find(),
      this.accounts.find(),
      this.tx.find(),
      this.customers.find(),
    ]);

    const monthSaleAmt = so.reduce((a, s) => a + s.qty * s.sale_price, 0);
    const monthPurchaseAmt = po.reduce((a, p) => a + p.qty * p.cost_price, 0);
    const monthSaleQty = so.reduce((a, s) => a + s.qty, 0);
    const totalStockQty = batches.reduce((a, b) => a + b.qty_remaining, 0);
    const accountBalance = accounts.reduce((acc, a) => {
      const inSum = tx.filter(t => t.account_id === a.id && t.direction === 'in').reduce((x, t) => x + t.amount, 0);
      const outSum = tx.filter(t => t.account_id === a.id && t.direction === 'out').reduce((x, t) => x + t.amount, 0);
      return acc + a.opening_balance + inSum - outSum;
    }, 0);

    const unpaidPo = po.filter(p => p.settle_status !== 'done');
    const unpaidSo = so.filter(s => s.receive_status !== 'done');
    const unpaidPoAmt = unpaidPo.reduce((a, p) => a + (p.qty * p.cost_price - p.paid_amount), 0);
    const unpaidSoAmt = unpaidSo.reduce((a, s) => a + (s.qty * s.sale_price - s.received_amount), 0);

    // 渠道结构
    const byType: Record<string, number> = {};
    for (const c of customers) byType[c.type] = (byType[c.type] || 0) + 1;
    const byNature: Record<string, number> = {};
    for (const c of customers) byNature[c.nature] = (byNature[c.nature] || 0) + 1;

    // 低库存 Top 5
    const lowStock = products.map(p => ({
      product: p,
      qty: batches.filter(b => b.product_id === p.id).reduce((a, b) => a + b.qty_remaining, 0),
    })).sort((a, b) => a.qty - b.qty).slice(0, 5);

    return {
      monthSaleAmt,
      monthPurchaseAmt,
      monthSaleQty,
      totalStockQty,
      accountBalance,
      batchCount: batches.length,
      productCount: products.length,
      unpaidPoCount: unpaidPo.length,
      unpaidSoCount: unpaidSo.length,
      unpaidPoAmt,
      unpaidSoAmt,
      byType,
      byNature,
      lowStock,
    };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([
    Product, PurchaseOrder, SalesOrder, InventoryBatch,
    PaymentAccount, PaymentTransaction, Customer,
  ])],
  controllers: [DashboardController],
})
export class DashboardModule {}
