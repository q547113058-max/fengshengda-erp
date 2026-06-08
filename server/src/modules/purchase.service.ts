// PurchaseService — 采购单业务逻辑
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentAccount } from '../entities/payment-account.entity';
import { Supplier } from '../entities/supplier.entity';
import { CreatePurchaseDto, UpdatePurchaseDto, PayPurchaseDto } from '../dto/purchase-sales.dto';
import { calcSettleStatus, genOrderNo } from '../common/business.utils';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(PurchaseOrder) private repo: Repository<PurchaseOrder>,
    @InjectRepository(PaymentTransaction) private tx: Repository<PaymentTransaction>,
    private ds: DataSource,
  ) {}

  list() { return this.repo.find({ order: { id: 'ASC' } }); }

  async one(id: number) {
    const o = await this.repo.findOne({ where: { id } });
    if (!o) throw new NotFoundException();
    return o;
  }

  /** 创建采购单：自动建批次 + 写入库流水 + 可选付款流水（事务内） */
  async create(body: CreatePurchaseDto) {
    return this.ds.transaction(async mgr => {
      const date = body.purchase_date || new Date().toISOString().slice(0, 10);
      const po_no = await genOrderNo(mgr, 'PO', date);

      const supplier = await mgr.findOne(Supplier, { where: { id: body.supplier_id } });
      if (!supplier) throw new NotFoundException(`供应商 ${body.supplier_id} 不存在`);

      const total = body.qty * body.cost_price;
      const order = await mgr.save(mgr.create(PurchaseOrder, {
        po_no,
        supplier_id: body.supplier_id,
        product_id: body.product_id,
        qty: body.qty,
        cost_price: body.cost_price,
        purchase_date: date,
        settle_status: calcSettleStatus(body.paid_amount || 0, total),
        paid_amount: body.paid_amount || 0,
        remark: body.remark,
        created_by: body.created_by,
      }));

      const batchNo = `B${date.replace(/-/g, '')}-${String(order.id).padStart(3, '0')}`;
      const batch = await mgr.save(mgr.create(InventoryBatch, {
        batch_no: batchNo,
        product_id: body.product_id,
        purchase_order_id: order.id,
        qty_total: body.qty,
        qty_remaining: body.qty,
        warehouse: body.warehouse || '佛山冷库A',
        holder: body.holder || '黄仓管',
        status: 'in_stock',
      }));

      await mgr.save(mgr.create(InventoryMovement, {
        batch_id: batch.id,
        type: 'in',
        qty: body.qty,
        operator: body.holder || '黄仓管',
        remark: `采购入库（PO: ${po_no}）`,
      }));

      if (body.paid_amount && body.paid_amount > 0) {
        const accountId = body.account_id
          || (await mgr.findOne(PaymentAccount, { where: { is_company: true } }))?.id;
        if (accountId) {
          await mgr.save(mgr.create(PaymentTransaction, {
            account_id: accountId,
            direction: 'out',
            amount: body.paid_amount,
            source_type: 'purchase',
            ref_order_id: order.id,
            ref_order_no: po_no,
            counter_party: supplier.name,
            operator_id: body.created_by,
            remark: `采购付款 ${po_no}`,
          }));
        }
      }

      return order;
    });
  }

  async update(id: number, body: UpdatePurchaseDto) {
    return this.ds.transaction(async mgr => {
      const cur = await mgr.findOne(PurchaseOrder, { where: { id } });
      if (!cur) throw new NotFoundException();
      const merged = { ...cur, ...body };
      const total = merged.qty * merged.cost_price;
      const newStatus = calcSettleStatus(merged.paid_amount, total);
      await mgr.update(PurchaseOrder, id, { ...body, settle_status: newStatus });
      return mgr.findOne(PurchaseOrder, { where: { id } });
    });
  }

  async remove(id: number) {
    return this.ds.transaction(async mgr => {
      const txCount = await mgr.count(PaymentTransaction, {
        where: { source_type: 'purchase', ref_order_id: id },
      });
      if (txCount > 0) {
        await mgr.update(PurchaseOrder, id, { settle_status: 'cancelled' as any });
        return { ok: true, soft_deleted: true, reason: '有关联付款流水，已软删' };
      }
      await mgr.delete(PurchaseOrder, id);
      return { ok: true };
    });
  }

  async pay(id: number, body: PayPurchaseDto) {
    return this.ds.transaction(async mgr => {
      const order = await mgr.findOne(PurchaseOrder, { where: { id } });
      if (!order) throw new NotFoundException();
      if ((order.paid_amount + body.amount) > order.qty * order.cost_price) {
        throw new BadRequestException('付款金额超过订单总额');
      }
      const newPaid = order.paid_amount + body.amount;
      const newStatus = calcSettleStatus(newPaid, order.qty * order.cost_price);
      await mgr.update(PurchaseOrder, id, { paid_amount: newPaid, settle_status: newStatus });
      const supplier = await mgr.findOne(Supplier, { where: { id: order.supplier_id } });
      await mgr.save(mgr.create(PaymentTransaction, {
        account_id: body.account_id,
        direction: 'out',
        amount: body.amount,
        source_type: 'purchase',
        ref_order_id: order.id,
        ref_order_no: order.po_no,
        counter_party: supplier?.name,
        operator_id: body.operator_id,
        remark: `采购付款 ${order.po_no}`,
      }));
      return mgr.findOne(PurchaseOrder, { where: { id } });
    });
  }
}
