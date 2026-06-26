import { Module, Controller, Get, Post, Put, Param, ParseIntPipe, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CommissionRecord } from '../entities/commission-record.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentAccount } from '../entities/payment-account.entity';
import { SettleCommissionDto } from '../dto/purchase-sales.dto';

@ApiTags('佣金')
@Controller('commission')
class CommissionController {
  constructor(
    @InjectRepository(CommissionRecord) private repo: Repository<CommissionRecord>,
    @InjectRepository(PaymentTransaction) private tx: Repository<PaymentTransaction>,
    @InjectRepository(PaymentAccount) private accounts: Repository<PaymentAccount>,
    private ds: DataSource,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    return status ? this.repo.find({ where: { settle_status: status as any }, order: { id: 'DESC' } })
                  : this.repo.find({ order: { id: 'DESC' } });
  }

  // 结算：更新记录 + 自动从某账户扣减
  @Post(':id/settle')
  @ApiOperation({ summary: '佣金结算（标 paid + 写财务 Tx）' })
  async settle(@Param('id', ParseIntPipe) id: number, @Body() body: SettleCommissionDto) {
    const rec = await this.repo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException();
    if (rec.settle_status === 'paid') throw new BadRequestException('已结算');
    const account = await this.accounts.findOne({ where: { id: body.account_id } });
    if (!account) throw new NotFoundException('账户不存在');

    return this.ds.transaction(async mgr => {
      await mgr.update(CommissionRecord, id, {
        settle_status: 'paid',
        settled_at: new Date(),
      });
      // 写一笔付款流水
      await mgr.save(mgr.create(PaymentTransaction, {
        account_id: body.account_id,
        direction: 'out',
        amount: rec.amount,
        source_type: 'commission',
        ref_order_id: rec.sales_order_id,
        ref_order_no: `SO#${rec.sales_order_id}`,
        counter_party: body.counter_party || `用户#${rec.sales_user_id}`,
        operator_id: body.operator_id,
        remark: `佣金结算 SO#${rec.sales_order_id}`,
      }));
      return mgr.findOne(CommissionRecord, { where: { id } });
    });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRecord, PaymentTransaction, PaymentAccount])],
  controllers: [CommissionController],
})
export class CommissionModule {}
