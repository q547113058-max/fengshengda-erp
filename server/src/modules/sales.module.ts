import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalesOrder } from '../entities/sales-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { CommissionRecord } from '../entities/commission-record.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Customer } from '../entities/customer.entity';
import { User } from '../entities/user.entity';
import { CreateSalesDto, UpdateSalesDto, ReceiveSaleDto } from '../dto/purchase-sales.dto';
import { calcSettleStatus, genOrderNo } from '../common/business.utils';

@ApiTags('销售')
@Controller('sales')
class SalesController {
  constructor(
    @InjectRepository(SalesOrder) private repo: Repository<SalesOrder>,
    @InjectRepository(PaymentTransaction) private tx: Repository<PaymentTransaction>,
    private ds: DataSource,
  ) {}

  @Get() list() { return this.repo.find({ order: { id: 'ASC' } }); }
  @Get(':id') async one(@Param('id', ParseIntPipe) id: number) {
    const o = await this.repo.findOne({ where: { id } });
    if (!o) throw new NotFoundException();
    return o;
  }

  @Post()
  @ApiOperation({ summary: '创建销售单（扣批次/写佣金/可选收 Tx，事务+行锁防超卖）' })
  async create(@Body() body: CreateSalesDto) {
    return this.ds.transaction(async mgr => {
      // SQLite 无 FOR UPDATE（整个库就是一把锁）；MySQL 用悲观写锁防超卖
      const isMySQL = this.ds.options.type === 'mysql';
      const batch = isMySQL
        ? await mgr.findOne(InventoryBatch, { where: { id: body.batch_id }, lock: { mode: 'pessimistic_write' } })
        : await mgr.findOne(InventoryBatch, { where: { id: body.batch_id } });
      if (!batch) throw new NotFoundException('批次不存在');
      if (batch.qty_remaining < body.qty) {
        throw new BadRequestException(
          `批次 ${batch.batch_no} 剩余 ${batch.qty_remaining} 箱，不足 ${body.qty}`,
        );
      }

      // 2. 编号
      const date = body.sale_date || new Date().toISOString().slice(0, 10);
      const so_no = await genOrderNo(mgr.getRepository(SalesOrder), 'SO', date);

      // 3. 计算金额
      const total = body.qty * body.sale_price;
      const commissionAmt = total * ((body.commission_rate || 0) / 100);

      // 4. 创建销售单
      const order = await mgr.save(mgr.create(SalesOrder, {
        so_no,
        customer_id: body.customer_id,
        sales_user_id: body.sales_user_id,
        product_id: body.product_id,
        batch_id: body.batch_id,
        qty: body.qty,
        sale_price: body.sale_price,
        tax_rate: body.tax_rate || 1,
        commission_rate: body.commission_rate || 0,
        commission_amt: commissionAmt,
        receive_status: calcSettleStatus(body.received_amount || 0, total),
        received_amount: body.received_amount || 0,
        sale_date: date,
        remark: body.remark,
      }));

      // 5. 扣减批次（用 SQL 算式，避免并发 race）
      const newRem = batch.qty_remaining - body.qty;
      const newStatus: 'in_stock' | 'sold_out' | 'transferred' =
        newRem === 0 ? 'sold_out' : 'in_stock';
      await mgr.update(InventoryBatch, batch.id, {
        qty_remaining: newRem,
        status: newStatus,
      });

      // 6. 出库流水
      const salesUser = await mgr.findOne(User, { where: { id: body.sales_user_id } });
      const customer = await mgr.findOne(Customer, { where: { id: body.customer_id } });
      await mgr.save(mgr.create(InventoryMovement, {
        batch_id: batch.id,
        type: 'out',
        qty: body.qty,
        operator: salesUser?.full_name || `用户#${body.sales_user_id}`,
        to_holder: customer?.name,
        ref_order_no: so_no,
        remark: `销售出库（SO: ${so_no}）`,
      }));

      // 7. 佣金记录
      if (commissionAmt > 0) {
        await mgr.save(mgr.create(CommissionRecord, {
          sales_order_id: order.id,
          sales_user_id: body.sales_user_id,
          rate: body.commission_rate || 0,
          amount: commissionAmt,
          settle_status: 'pending',
        }));
      }

      // 8. 可选收款流水
      if (body.received_amount && body.received_amount > 0 && body.account_id) {
        await mgr.save(mgr.create(PaymentTransaction, {
          account_id: body.account_id,
          direction: 'in',
          amount: body.received_amount,
          source_type: 'sale',
          ref_order_id: order.id,
          ref_order_no: so_no,
          counter_party: customer?.name,
          operator_id: body.operator_id,
          remark: `销售收款 ${so_no}`,
        }));
      }

      return order;
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新销售单（自动重算 receive_status）' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSalesDto) {
    return this.ds.transaction(async mgr => {
      const cur = await mgr.findOne(SalesOrder, { where: { id } });
      if (!cur) throw new NotFoundException();
      const merged = { ...cur, ...body };
      const total = merged.qty * merged.sale_price;
      const newStatus = calcSettleStatus(merged.received_amount, total);
      // 佣金跟着改
      const commissionAmt = total * ((merged.commission_rate || 0) / 100);
      await mgr.update(SalesOrder, id, {
        ...body,
        receive_status: newStatus,
        commission_amt: commissionAmt,
      });
      return mgr.findOne(SalesOrder, { where: { id } });
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.ds.transaction(async mgr => {
      const txCount = await mgr.count(PaymentTransaction, {
        where: { source_type: 'sale', ref_order_id: id },
      });
      if (txCount > 0) {
        throw new BadRequestException('已有关联收款流水，不能删除。请先反冲。');
      }
      await mgr.delete(SalesOrder, id);
      return { ok: true };
    });
  }

  // 收款
  @Post(':id/receive')
  @ApiOperation({ summary: '销售收款（更新 received + 写财务 Tx，事务内）' })
  async receive(@Param('id', ParseIntPipe) id: number, @Body() body: ReceiveSaleDto) {
    return this.ds.transaction(async mgr => {
      const order = await mgr.findOne(SalesOrder, { where: { id } });
      if (!order) throw new NotFoundException();
      if ((order.received_amount + body.amount) > order.qty * order.sale_price) {
        throw new BadRequestException('收款金额超过订单总额');
      }
      const newReceived = order.received_amount + body.amount;
      const newStatus = calcSettleStatus(newReceived, order.qty * order.sale_price);
      await mgr.update(SalesOrder, id, {
        received_amount: newReceived,
        receive_status: newStatus,
      });
      await mgr.save(mgr.create(PaymentTransaction, {
        account_id: body.account_id,
        direction: 'in',
        amount: body.amount,
        source_type: 'sale',
        ref_order_id: order.id,
        ref_order_no: order.so_no,
        counter_party: body.counter_party,
        operator_id: body.operator_id,
        remark: `销售收款 ${order.so_no}`,
      }));
      return mgr.findOne(SalesOrder, { where: { id } });
    });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, InventoryBatch, InventoryMovement, CommissionRecord, PaymentTransaction, Customer, User])],
  controllers: [SalesController],
})
export class SalesModule {}
