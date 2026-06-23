import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer-supplier.dto';
import { GetUser } from '../common/get-user.decorator';
import { genCustomerCode } from '../common/business.utils';

@ApiTags('客户')
@Controller('customers')
class CustomersController {
  constructor(
    @InjectRepository(Customer) private repo: Repository<Customer>,
    private dataSource: DataSource,
  ) {}

  @Get() @ApiOperation({ summary: '客户列表' })
  list(@GetUser() user: any) {
    if (user.role === 'boss') {
      return this.repo.find({ order: { id: 'ASC' } });
    }
    // sales 角色只看自己录入的、或共享给自己的客户
    return this.repo
      .createQueryBuilder('c')
      .where('c.sales_user_id = :uid', { uid: user.id })
      .orWhere('FIND_IN_SET(:uid, c.shared_to_user_ids COLLATE utf8mb4_general_ci) > 0')
      .orderBy('c.id', 'ASC')
      .getMany();
  }

  @Get(':id') @ApiOperation({ summary: '客户详情' })
  async one(@Param('id', ParseIntPipe) id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  @Post() @ApiOperation({ summary: '新建客户' })
  async create(@Body() body: CreateCustomerDto, @GetUser() user: any) {
    // 1. 重名检测：新名字是否包含已有客户名（关键词重复）
    const duplicates = await this.repo
      .createQueryBuilder('c')
      .where('c.name LIKE :kw', { kw: `%${body.name}%` })
      .orWhere(':name LIKE CONCAT("%", c.name, "%")', { name: body.name })
      .getMany();

    // 2. 生成客户编号（在事务中用行锁保证并发安全）
    const code = await this.dataSource.transaction(async (mgr) => {
      return genCustomerCode(mgr);
    });

    // 3. 创建客户记录
    const customer = this.repo.create({
      ...body,
      code,
      sales_user_id: body.sales_user_id ?? user.id,
    } as any);

    const { shared_to_user_ids, ...rest } = body as any;
    const saved = await this.repo.save({
      ...customer,
      ...rest,
      shared_to_user_ids: shared_to_user_ids ? String(shared_to_user_ids) : null,
    } as any);

    // 4. 如果有重名，返回警告信息
    if (duplicates.length > 0) {
      const warns = duplicates.map((d) => ({
        id: d.id,
        name: d.name,
        owner: d.sales_user_id,
      }));
      return { ...saved, _warning: `已有相似客户：${warns.map((w) => `${w.name}(归属用户#${w.owner})`).join('、')}，请核对后再录` };
    }

    return saved;
  }

  @Put(':id') @ApiOperation({ summary: '更新客户' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCustomerDto) {
    const { shared_to_user_ids, ...rest } = body as any;
    await this.repo.update(id, {
      ...rest,
      shared_to_user_ids: shared_to_user_ids ? String(shared_to_user_ids) : null,
    } as any);
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
