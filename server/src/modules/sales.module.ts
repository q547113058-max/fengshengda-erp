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

@ApiTags('销售')
@Controller('sales')
class SalesController {
  constructor(
    @InjectRepository(SalesOrder) private repo: Repository<SalesOrder>,
    @InjectRepository(InventoryBatch) private batches: Repository<InventoryBatch>,
    @InjectRepository(InventoryMovement) private movements: Repository<InventoryMovement>,
    @InjectRepository(CommissionRecord) private commissions: Repository<CommissionRecord>,
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
  @ApiOperation({ summary: '创建销售单（扣批次/写佣金/可选收 Tx）' })
  async create(@Body() body: CreateSalesDto) {
    if (!body.customer_id || !body.product_id || !body.batch_id || !body.qty || !body.sale_price) {
      throw new BadRequestException('customer_id / product_id / batch_id / qty / sale_price 必填');
    }
    return this.ds.transaction(async mgr => {
      const batch = await mgr.findOne(InventoryBatch, { where: { id: body.batch_id } });
      if (!batch) throw new NotFoundException('批次不存在');
      if (batch.qty_remaining < (body.qty || 0)) throw new BadRequestException(`批次 ${batch.batch_no} 剩余 ${batch.qty_remaining} 箱，不足`);

      // 单号
      const date = (body.sale_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(2);
      const todayCount = await mgr.count(SalesOrder, { where: { sale_date: body.sale_date || new Date().toISOString().slice(0, 10) } });
      const so_no = `SO${date}-${String(todayCount + 1).padStart(2, '0')}`;

      const total = (body.qty || 0) * (body.sale_price || 0);
      const commissionAmt = total * ((body.commission_rate || 0) / 100);

      // 1. 创建销售单
      const order = await mgr.save(mgr.create(SalesOrder, {
        so_no,
        customer_id: body.customer_id!,
        sales_user_id: body.sales_user_id!,
        product_id: body.product_id!,
        batch_id: body.batch_id!,
        qty: body.qty!,
        sale_price: body.sale_price!,
        tax_rate: body.tax_rate || 1,
        commission_rate: body.commission_rate || 0,
        commission_amt: commissionAmt,
        receive_status: body.received_amount && body.received_amount >= total ? 'done' : (body.received_amount ? 'partial' : 'unpaid'),
        received_amount: body.received_amount || 0,
        sale_date: body.sale_date || new Date().toISOString().slice(0, 10),
        remark: body.remark,
      }));

      // 2. 扣减批次
      await mgr.update(InventoryBatch, batch.id, {
        qty_remaining: batch.qty_remaining - body.qty!,
        status: batch.qty_remaining - body.qty! === 0 ? 'sold_out' : 'in_stock',
      });

      // 3. 写一个出库流水 + 写佣金记录 + 可选收款（事务内）
      // 操作人/接手人 由 controller 在事务内查询后填入，避免 DTO 携带冗余字段
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

      // 4. 写佣金记录
      if (commissionAmt > 0) {
        await mgr.save(mgr.create(CommissionRecord, {
          sales_order_id: order.id,
          sales_user_id: body.sales_user_id!,
          rate: body.commission_rate || 0,
          amount: commissionAmt,
          settle_status: 'pending',
        }));
      }

      // 5. 如果有收款
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
  @ApiOperation({ summary: '更新销售单' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSalesDto) {
    await this.repo.update(id, body);
    return this.repo.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }

  // 收款
  @Post(':id/receive')
  @ApiOperation({ summary: '销售收款（更新 received + 写财务 Tx）' })
  async receive(@Param('id', ParseIntPipe) id: number, @Body() body: ReceiveSaleDto) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException();
    const total = order.qty * order.sale_price;
    const newReceived = order.received_amount + body.amount;
    const newStatus = newReceived >= total ? 'done' : (newReceived > 0 ? 'partial' : 'unpaid');
    await this.repo.update(id, { received_amount: newReceived, receive_status: newStatus });
    await this.tx.save(this.tx.create({
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
    return this.repo.findOne({ where: { id } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, InventoryBatch, InventoryMovement, CommissionRecord, PaymentTransaction])],
  controllers: [SalesController],
})
export class SalesModule {}
