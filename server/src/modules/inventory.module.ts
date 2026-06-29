import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { Product } from '../entities/product.entity';
import { CreateMovementDto } from '../dto/purchase-sales.dto';
import { UpdateBatchDto } from '../dto/inventory.dto';

@ApiTags('库存')
@Controller()
class InventoryController {
  constructor(
    @InjectRepository(InventoryBatch) private batches: Repository<InventoryBatch>,
    @InjectRepository(InventoryMovement) private movements: Repository<InventoryMovement>,
    @InjectRepository(Product) private products: Repository<Product>,
    private ds: DataSource,
  ) {}

  @Get('inventory/batches') listBatches() { return this.batches.find({ order: { id: 'DESC' } }); }

  @Get('inventory/aggregated')
  @ApiOperation({ summary: '按产品聚合库存（SQL GROUP BY，不在 Node 端 N+1 过滤）' })
  async aggregated() {
    // 在数据库做 GROUP BY + 关联
    const rows = await this.batches
      .createQueryBuilder('b')
      .select('b.product_id', 'product_id')
      .addSelect('COUNT(*)', 'batch_count')
      .addSelect('SUM(b.qty_total)', 'qty_total')
      .addSelect('SUM(b.qty_remaining)', 'qty_remaining')
      .addSelect('SUM(b.qty_total - b.qty_remaining)', 'sold')
      .groupBy('b.product_id')
      .getRawMany();
    const products = await this.products.find();
    return products.map(p => {
      const r = rows.find((row: any) => row.product_id === p.id);
      return {
        product: p,
        batchCount: Number(r?.batch_count) || 0,
        qtyTotal: Number(r?.qty_total) || 0,
        qtyRem: Number(r?.qty_remaining) || 0,
        sold: Number(r?.sold) || 0,
      };
    });
  }

  @Get('inventory/batch/:id') async oneBatch(@Param('id', ParseIntPipe) id: number) {
    const b = await this.batches.findOne({ where: { id } });
    if (!b) throw new NotFoundException();
    return b;
  }

  @Put('inventory/batch/:id')
  @ApiOperation({ summary: '更新批次（仅允许 warehouse/holder/status/qty_remaining）' })
  async updateBatch(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateBatchDto) {
    await this.batches.update(id, body);
    return this.batches.findOne({ where: { id } });
  }

  // 手工出入库
  @Post('inventory/movement')
  @ApiOperation({ summary: '登记出入库（入库可选自动建批次）' })
  async addMovement(@Body() body: CreateMovementDto) {
    return this.ds.transaction(async mgr => {
      let batchId = body.batch_id;
      // 入库/退货且选了「新建批次」：自动创建批次
      if ((body.type === 'in' || body.type === 'return') && batchId === -1 && body.product_id) {
        const product = await mgr.findOne(Product, { where: { id: body.product_id } });
        if (!product) throw new NotFoundException('产品不存在');
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mgr.count(InventoryBatch);
        const batchNo = `B${today}-${String(count + 1).padStart(3, '0')}`;
        const newBatch = await mgr.save(mgr.create(InventoryBatch, {
          batch_no: batchNo,
          product_id: body.product_id,
          qty_total: 0,
          qty_remaining: 0,
          warehouse: body.warehouse || '佛山冷库A',
          holder: body.operator || '黄仓管',
          status: 'in_stock',
        }));
        batchId = newBatch.id;
      }
      if (!batchId) throw new BadRequestException('请选择批次或指定产品入库');
      const batch = await mgr.findOne(InventoryBatch, { where: { id: batchId } });
      if (!batch) throw new NotFoundException('批次不存在');
      // 校验数量（DTO 已校验 qty>0）
      if ((body.type === 'out' || body.type === 'loss') && batch.qty_remaining < body.qty) {
        throw new BadRequestException(`批次 ${batch.batch_no} 剩余 ${batch.qty_remaining} 吨，不足`);
      }
      const newRem = (body.type === 'in' || body.type === 'return') ? batch.qty_remaining + body.qty : batch.qty_remaining - body.qty;
      // status 逻辑：按 type 分支判断，不混三元
      let newStatus: 'in_stock' | 'sold_out' | 'transferred';
      if (newRem === 0) newStatus = 'sold_out';
      else if (body.type === 'transfer') newStatus = 'transferred';
      else newStatus = 'in_stock';
      const updateData: any = { qty_remaining: newRem, status: newStatus };
      // 入库/退货时同步增加总量
      if (body.type === 'in' || body.type === 'return') {
        updateData.qty_total = batch.qty_total + body.qty;
      }
      await mgr.update(InventoryBatch, batch.id, updateData);
      return mgr.save(mgr.create(InventoryMovement, {
        batch_id: batch.id,
        type: body.type,
        qty: body.qty,
        operator: body.operator,
        to_holder: body.to_holder,
        ref_order_no: body.ref_order_no,
        remark: body.remark,
      }));
    });
  }

  @Get('movements')
  listMovements(@Query('type') type?: string, @Query('batch_id') batchId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (batchId) where.batch_id = +batchId;
    return this.movements.find({ where, order: { id: 'DESC' } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([InventoryBatch, InventoryMovement, Product])],
  controllers: [InventoryController],
})
export class InventoryModule {}
