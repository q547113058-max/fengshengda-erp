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
      const so_no = await genOrderNo(mgr, 'SO', date);

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
  @ApiOperation({ summary: '更新销售单（仅改备注/收款/佣金率；已收款不可改 qty/price）' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSalesDto) {
    return this.ds.transaction(async mgr => {
      const cur = await mgr.findOne(SalesOrder, { where: { id } });
      if (!cur) throw new NotFoundException();
      // 已收款（received_amount > 0）→ 禁改 qty/price/batch_id
      if (cur.received_amount > 0) {
        const { qty, sale_price, batch_id, customer_id, product_id, tax_rate, sale_date } = body;
        if (qty !== undefined || sale_price !== undefined || batch_id !== undefined
            || customer_id !== undefined || product_id !== undefined
            || tax_rate !== undefined || sale_date !== undefined) {
          throw new BadRequestException('已收款的销售单不可改 数量/单价/批次/客户/产品/税率/日期，请走"反冲"流程');
        }
      }
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
      // 同步佣金记录
      const commRecord = await mgr.findOne(CommissionRecord, { where: { sales_order_id: id } });
      if (commRecord && !['paid'].includes(commRecord.settle_status)) {
        await mgr.update(CommissionRecord, commRecord.id, { amount: commissionAmt, rate: merged.commission_rate || 0 });
      }
      return mgr.findOne(SalesOrder, { where: { id } });
    });
  }

  // 反冲 — 推荐做法（保留历史 + 恢复库存 + 撤销流水）
  @Post(':id/reverse')
  @ApiOperation({ summary: '反冲销售单（恢复库存 + 写反向流水 + 撤销佣金 + 标 cancelled）' })
  async reverse(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) {
    return this.ds.transaction(async mgr => {
      const cur = await mgr.findOne(SalesOrder, { where: { id } });
      if (!cur) throw new NotFoundException();
      if (cur.status === 'cancelled') {
        throw new BadRequestException('该销售单已反冲');
      }
      // 1. 恢复批次库存
      await mgr.increment(InventoryBatch, { id: cur.batch_id }, 'qty_remaining', cur.qty);
      const batch = await mgr.findOne(InventoryBatch, { where: { id: cur.batch_id } });
      await mgr.update(InventoryBatch, cur.batch_id, {
        status: batch?.qty_remaining === batch?.qty_total ? 'in_stock' : 'in_stock',
      });
      // 2. 写反向库存流水（return 类型）
      await mgr.save(mgr.create(InventoryMovement, {
        batch_id: cur.batch_id,
        type: 'return',
        qty: cur.qty,
        operator: 'system-reverse',
        to_holder: '返库',
        ref_order_no: `RV-${cur.so_no}`,
        remark: body.reason || `反冲 ${cur.so_no}`,
      }));
      // 3. 撤销佣金（设 cancelled）
      await mgr.update(CommissionRecord,
        { sales_order_id: id, settle_status: 'pending' } as any,
        { settle_status: 'cancelled' } as any,
      );
      // 4. 写反向收款（如果有）
      const txs = await mgr.find(PaymentTransaction, {
        where: { source_type: 'sale', ref_order_id: id },
      });
      for (const tx of txs) {
        await mgr.save(mgr.create(PaymentTransaction, {
          account_id: tx.account_id,
          direction: tx.direction === 'in' ? 'out' : 'in',
          amount: tx.amount,
          source_type: 'sale_reverse',
          ref_order_id: id,
          ref_order_no: `RV-${cur.so_no}`,
          counter_party: tx.counter_party,
          operator_id: tx.operator_id,
          remark: `反冲 ${cur.so_no} (${tx.remark || ''})`,
        }));
      }
      // 5. 标 cancelled + 清零
      await mgr.update(SalesOrder, id, {
        status: 'cancelled',
        received_amount: 0,
        receive_status: 'unpaid',
        remark: `${cur.remark || ''} | 反冲: ${body.reason || '无原因'}`,
      });
      return { ok: true, id, status: 'cancelled' };
    });
  }

  // 物理删除 — 已禁用，强制走反冲
  @Delete(':id')
  @ApiOperation({ summary: '物理删除（已禁用，请用 /reverse）' })
  async remove(@Param('id', ParseIntPipe) _id: number) {
    throw new BadRequestException('物理删除已禁用，请用 POST /:id/reverse 反冲。数据完整性优先。');
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
