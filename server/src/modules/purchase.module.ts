import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentAccount } from '../entities/payment-account.entity';
import { Supplier } from '../entities/supplier.entity';
import { CreatePurchaseDto, UpdatePurchaseDto, PayPurchaseDto } from '../dto/purchase-sales.dto';

@ApiTags('采购')
@Controller('purchase')
class PurchaseController {
  constructor(
    @InjectRepository(PurchaseOrder) private repo: Repository<PurchaseOrder>,
    @InjectRepository(InventoryBatch) private batches: Repository<InventoryBatch>,
    @InjectRepository(InventoryMovement) private movements: Repository<InventoryMovement>,
    @InjectRepository(PaymentTransaction) private tx: Repository<PaymentTransaction>,
    @InjectRepository(PaymentAccount) private accounts: Repository<PaymentAccount>,
    private ds: DataSource,
  ) {}

  @Get() list() { return this.repo.find({ order: { id: 'ASC' } }); }
  @Get(':id') async one(@Param('id', ParseIntPipe) id: number) {
    const o = await this.repo.findOne({ where: { id } });
    if (!o) throw new NotFoundException();
    return o;
  }

  // 创建采购单 + 自动建批次 + 写入库流水
  @Post()
  @ApiOperation({ summary: '创建采购单（自动建批次/写流水/可选付 Tx）' })
  async create(@Body() body: CreatePurchaseDto) {
    if (!body.supplier_id || !body.product_id || !body.qty || !body.cost_price) {
      throw new BadRequestException('supplier_id / product_id / qty / cost_price 必填');
    }
    return this.ds.transaction(async mgr => {
      // 1. 采购单号
      const date = (body.purchase_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(2);
      const todayCount = await mgr.count(PurchaseOrder, { where: { purchase_date: body.purchase_date || new Date().toISOString().slice(0, 10) } });
      const po_no = `PO${date}-${String(todayCount + 1).padStart(2, '0')}`;

      // 2. 创建采购单
      const order = await mgr.save(mgr.create(PurchaseOrder, {
        po_no,
        supplier_id: body.supplier_id,
        product_id: body.product_id,
        qty: body.qty,
        cost_price: body.cost_price,
        purchase_date: body.purchase_date || new Date().toISOString().slice(0, 10),
        settle_status: body.paid_amount && body.paid_amount >= body.qty * body.cost_price ? 'done' : (body.paid_amount ? 'partial' : 'unpaid'),
        paid_amount: body.paid_amount || 0,
        remark: body.remark,
        created_by: body.created_by,
      }));

      // 3. 自动建库存批次
      const batchNo = `B${(body.purchase_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')}-${String(order.id).padStart(3, '0')}`;
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

      // 4. 写一条入库流水
      await mgr.save(mgr.create(InventoryMovement, {
        batch_id: batch.id,
        type: 'in',
        qty: body.qty,
        operator: body.holder || '黄仓管',
        remark: `采购入库（PO: ${po_no}）`,
      }));

      // 5. 如果有付款，写一条付款流水
      if (body.paid_amount && body.paid_amount > 0) {
        const accountId = body.account_id || (await mgr.findOne(PaymentAccount, { where: { is_company: true } }))?.id;
        if (accountId) {
          // 从 supplier_id 查 supplier name
          const supplier = await mgr.findOne(Supplier, { where: { id: body.supplier_id } });
          await mgr.save(mgr.create(PaymentTransaction, {
            account_id: accountId,
            direction: 'out',
            amount: body.paid_amount,
            source_type: 'purchase',
            ref_order_id: order.id,
            ref_order_no: po_no,
            counter_party: supplier?.name,
            operator_id: body.created_by,
            remark: `采购付款 ${po_no}`,
          }));
        }
      }

      return order;
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新采购单' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePurchaseDto) {
    await this.repo.update(id, body);
    return this.repo.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }

  // 付款：更新已付 + 写一条付款流水
  @Post(':id/pay')
  @ApiOperation({ summary: '采购付款（更新 paid_amount + 写财务 Tx）' })
  async pay(@Param('id', ParseIntPipe) id: number, @Body() body: PayPurchaseDto) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException();
    const total = order.qty * order.cost_price;
    const newPaid = order.paid_amount + body.amount;
    const newStatus = newPaid >= total ? 'done' : (newPaid > 0 ? 'partial' : 'unpaid');
    await this.repo.update(id, { paid_amount: newPaid, settle_status: newStatus });
    // 写财务流水
    await this.tx.save(this.tx.create({
      account_id: body.account_id,
      direction: 'out',
      amount: body.amount,
      source_type: 'purchase',
      ref_order_id: order.id,
      ref_order_no: order.po_no,
      counter_party: order.supplier_id ? undefined : undefined,
      operator_id: body.operator_id,
      remark: `采购付款 ${order.po_no}`,
    }));
    return this.repo.findOne({ where: { id } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, InventoryBatch, InventoryMovement, PaymentTransaction, PaymentAccount])],
  controllers: [PurchaseController],
})
export class PurchaseModule {}
