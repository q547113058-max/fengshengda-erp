import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto/customer-supplier.dto';

@ApiTags('供应商')
@Controller('suppliers')
class SuppliersController {
  constructor(@InjectRepository(Supplier) private repo: Repository<Supplier>) {}

  @Get() @ApiOperation({ summary: '供应商列表' })
  list() { return this.repo.find({ order: { id: 'ASC' } }); }

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

  @Delete(':id') @ApiOperation({ summary: '删除供应商' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  controllers: [SuppliersController],
})
export class SuppliersModule {}
