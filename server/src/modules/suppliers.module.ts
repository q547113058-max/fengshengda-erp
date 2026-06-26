import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto/customer-supplier.dto';

@ApiTags('供应商')
@Controller('suppliers')
class SuppliersController {
  constructor(
    @InjectRepository(Supplier) private repo: Repository<Supplier>,
    private ds: DataSource,
  ) {}

  @Get() @ApiOperation({ summary: '供应商列表' })
  list() { return this.repo.find({ order: { id: 'DESC' } }); }

  @Get(':id') @ApiOperation({ summary: '供应商详情' })
  async one(@Param('id', ParseIntPipe) id: number) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException();
    return s;
  }

  @Post() @ApiOperation({ summary: '新建供应商' })
  create(@Body() body: CreateSupplierDto) {
    return this.repo.save(this.repo.create(body));
  }

  @Put(':id') @ApiOperation({ summary: '更新供应商' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSupplierDto) {
    await this.repo.update(id, body);
    return this.repo.findOne({ where: { id } });
  }

  @Delete(':id') @ApiOperation({ summary: '删除供应商（采购单保留，解除关联）' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    const isSQLite = this.ds.options.type === 'better-sqlite3';
    await qr.query(isSQLite ? 'PRAGMA foreign_keys = OFF' : 'SET FOREIGN_KEY_CHECKS = 0');
    await qr.startTransaction();
    try {
      await qr.query(`UPDATE purchase_orders SET supplier_id = 0 WHERE supplier_id = ${id}`);
      await qr.query(`DELETE FROM suppliers WHERE id = ${id}`);
      await qr.commitTransaction();
      return { ok: true };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.query(isSQLite ? 'PRAGMA foreign_keys = ON' : 'SET FOREIGN_KEY_CHECKS = 1');
      await qr.release();
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  controllers: [SuppliersController],
})
export class SuppliersModule {}
