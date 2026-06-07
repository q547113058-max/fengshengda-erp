import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer-supplier.dto';

@ApiTags('客户')
@Controller('customers')
class CustomersController {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>) {}

  @Get() @ApiOperation({ summary: '客户列表' })
  list() { return this.repo.find({ order: { id: 'ASC' } }); }

  @Get(':id') @ApiOperation({ summary: '客户详情' })
  async one(@Param('id', ParseIntPipe) id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  @Post() @ApiOperation({ summary: '新建客户' })
  create(@Body() body: CreateCustomerDto) {
    return this.repo.save(this.repo.create(body as any));
  }

  @Put(':id') @ApiOperation({ summary: '更新客户' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCustomerDto) {
    await this.repo.update(id, body as any);
    return this.repo.findOne({ where: { id } });
  }

  @Delete(':id') @ApiOperation({ summary: '删除客户' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [CustomersController],
})
export class CustomersModule {}
