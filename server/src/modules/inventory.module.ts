import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { Product } from '../entities/product.entity';
import { CreateMovementDto } from '../dto/purchase-sales.dto';

@ApiTags('库存')
@Controller()
class InventoryController {
  constructor(
    @InjectRepository(InventoryBatch) private batches: Repository<InventoryBatch>,
    @InjectRepository(InventoryMovement) private movements: Repository<InventoryMovement>,
    @InjectRepository(Product) private products: Repository<Product>,
    private ds: DataSource,
  ) {}

  @Get('inventory/batches') listBatches() { return this.batches.find({ order: { id: 'ASC' } }); }

  @Get('inventory/aggregated')
  async aggregated() {
    const list = await this.batches.find();
    const products = await this.products.find();
    return products.map(p => {
      const my = list.filter(b => b.product_id === p.id);
      return {
        product: p,
        batchCount: my.length,
        qtyTotal: my.reduce((a, b) => a + b.qty_total, 0),
        qtyRem: my.reduce((a, b) => a + b.qty_remaining, 0),
        sold: my.reduce((a, b) => a + (b.qty_total - b.qty_remaining), 0),
      };
    });
  }

  @Get('inventory/batch/:id') async oneBatch(@Param('id', ParseIntPipe) id: number) {
    const b = await this.batches.findOne({ where: { id } });
    if (!b) throw new NotFoundException();
    return b;
  }

  @Put('inventory/batch/:id') async updateBatch(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<InventoryBatch>) {
    await this.batches.update(id, body);
    return this.batches.findOne({ where: { id } });
  }

  // 手工出入库
  @Post('inventory/movement')
  @ApiOperation({ summary: '登记出入库（自动扣减/增加批次剩余）' })
  async addMovement(@Body() body: CreateMovementDto) {
    if (!body.batch_id || !body.type || !body.qty) throw new BadRequestException('batch_id/type/qty 必填');
    return this.ds.transaction(async mgr => {
      const batch = await mgr.findOne(InventoryBatch, { where: { id: body.batch_id } });
      if (!batch) throw new NotFoundException('批次不存在');
      // 校验数量
      if ((body.type === 'out' || body.type === 'loss') && batch.qty_remaining < body.qty) {
        throw new BadRequestException(`批次 ${batch.batch_no} 剩余 ${batch.qty_remaining} 箱，不足`);
      }
      const newRem = (body.type === 'in' || body.type === 'return') ? batch.qty_remaining + body.qty : batch.qty_remaining - body.qty;
      await mgr.update(InventoryBatch, batch.id, {
        qty_remaining: newRem,
        status: newRem === 0 ? 'sold_out' : (body.type === 'transfer' ? 'transferred' : 'in_stock'),
      });
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
    return this.movements.find({ where, order: { id: 'ASC' } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([InventoryBatch, InventoryMovement, Product])],
  controllers: [InventoryController],
})
export class InventoryModule {}
