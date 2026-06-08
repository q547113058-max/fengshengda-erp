// SalesService — 销售单业务逻辑（创建/反冲/收款）
// 事务：MySQL 走 pessimistic_write 行锁；SQLite 整库锁（不需要）
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalesOrder } from '../entities/sales-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { CommissionRecord } from '../entities/commission-record.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Customer } from '../entities/customer.entity';
import { User } from '../entities/user.entity';
import { CreateSalesDto, UpdateSalesDto, ReceiveSaleDto } from '../dto/purchase-sales.dto';
import { calcSettleStatus, genOrderNo } from '../common/business.utils';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder) private repo: Repository<SalesOrder>,
    @InjectRepository(PaymentTransaction) private tx: Repository<PaymentTransaction>,
    private ds: DataSource,
  ) {}

  list() { return this.repo.find({ order: { id: 'ASC' } }); }

  async one(id: number) {
    const o = await this.repo.findOne({ where: { id } });
    if (!o) throw new NotFoundException();
    return o;
  }

  /** 创建销售单：扣批次 + 出库流水 + 佣金记录 + 收款流水，事务+行锁防超卖 */
  async create(body: CreateSalesDto) {
    return this.ds.transaction(async mgr => {
      const isMySQL = this.ds.options.type === 'mysql';
      const batch = isMySQL
        ? await mgr.findOne(InventoryBatch, { where: { id: body.batch_id }, lock: { mode: 'pessimistic_write' } })
        : await mgr.findOne(InventoryBatch, { where: { id: body.batch_id } });
      if (!batch) throw new NotFoundException('批次不存在');
      if (batch.qty_remaining < body.qty) {
        throw new BadRequestException(
          `批次 ${batch.batch_no} 剩余 ${batch.qty_remaining} 吨，不足 ${body.qty}`,
        );
      }

      const date = body.sale_date || new Date().toISOString().slice(0, 10);
      const so_no = await genOrderNo(mgr, 'SO', date);

      const total = body.qty * body.sale_price;
      const commissionAmt = total * ((body.commission_rate || 0) / 100);

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

      // 扣减批次
      const newRem = batch.qty_remaining - body.qty;
      const newStatus: 'in_stock' | 'sold_out' | 'transferred' =
        newRem === 0 ? 'sold_out' : 'in_stock';
      await mgr.update(InventoryBatch, batch.id, {
        qty_remaining: newRem,
        status: newStatus,
      });

      // 出库流水
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

      // 佣金记录
      if (commissionAmt > 0) {
        await mgr.save(mgr.create(CommissionRecord, {
          sales_order_id: order.id,
          sales_user_id: body.sales_user_id,
          rate: body.commission_rate || 0,
          amount: commissionAmt,
          settle_status: 'pending',
        }));
      }

      // 可选收款流水
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

  /** 更新销售单（已收款禁改 qty/price/batch 等） */
  async update(id: number, body: UpdateSalesDto) {
    return this.ds.transaction(async mgr => {
      const cur = await mgr.findOne(SalesOrder, { where: { id } });
      if (!cur) throw new NotFoundException();
      // 已收款禁改核心字段（数据完整性）
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

  /** 反冲销售单：恢复批次 + 反向流水 + 撤销佣金 + 反向收款 + 标 cancelled */
  async reverse(id: number, body: { reason?: string }) {
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
      // 2. 写反向库存流水
      await mgr.save(mgr.create(InventoryMovement, {
        batch_id: cur.batch_id,
        type: 'return',
        qty: cur.qty,
        operator: 'system-reverse',
        to_holder: '返库',
        ref_order_no: `RV-${cur.so_no}`,
        remark: body.reason || `反冲 ${cur.so_no}`,
      }));
      // 3. 撤销佣金（仅 pending 状态）
      await mgr.update(CommissionRecord,
        { sales_order_id: id, settle_status: 'pending' } as any,
        { settle_status: 'cancelled' } as any,
      );
      // 4. 写反向收款
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
      // 5. 标 cancelled
      await mgr.update(SalesOrder, id, {
        status: 'cancelled',
        received_amount: 0,
        receive_status: 'unpaid',
        remark: `${cur.remark || ''} | 反冲: ${body.reason || '无原因'}`,
      });
      return { ok: true, id, status: 'cancelled' };
    });
  }

  /** 销售收款：更新 received + 写财务 Tx，事务内 */
  async receive(id: number, body: ReceiveSaleDto) {
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
