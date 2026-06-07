import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentAccount } from '../entities/payment-account.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { CreateAccountDto, UpdateAccountDto, CreateTransactionDto } from '../dto/finance-media.dto';

@ApiTags('财务')
@Controller('finance')
class FinanceController {
  constructor(
    @InjectRepository(PaymentAccount) private accountRepo: Repository<PaymentAccount>,
    @InjectRepository(PaymentTransaction) private txRepo: Repository<PaymentTransaction>,
  ) {}

  @Get('accounts') listAccounts() { return this.accountRepo.find({ order: { id: 'ASC' } }); }
  @Get('account/:id') async getAccount(@Param('id', ParseIntPipe) id: number) {
    const a = await this.accountRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException();
    return a;
  }
  @Post('accounts') @ApiOperation({ summary: '新建支付账户' })
  createAccount(@Body() body: CreateAccountDto) {
    return this.accountRepo.save(this.accountRepo.create(body as any));
  }
  @Put('accounts/:id') @ApiOperation({ summary: '更新账户' })
  async updateAccount(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateAccountDto) {
    await this.accountRepo.update(id, body as any);
    return this.accountRepo.findOne({ where: { id } });
  }
  @Delete('accounts/:id') async removeAccount(@Param('id', ParseIntPipe) id: number) {
    await this.accountRepo.delete(id);
    return { ok: true };
  }

  @Get('transactions')
  listTx(@Query('direction') dir?: string) {
    return dir ? this.txRepo.find({ where: { direction: dir as any }, order: { id: 'ASC' } })
               : this.txRepo.find({ order: { id: 'ASC' } });
  }
  @Get('receive') listReceive() { return this.txRepo.find({ where: { direction: 'in' }, order: { id: 'ASC' } }); }
  @Get('pay') listPay() { return this.txRepo.find({ where: { direction: 'out' }, order: { id: 'ASC' } }); }

  // 手工记账（来源 manual）
  @Post('transactions')
  @ApiOperation({ summary: '手工记账（任意 source_type=manual）' })
  createTx(@Body() body: CreateTransactionDto) {
    return this.txRepo.save(this.txRepo.create(body as any));
  }

  // 物理删除 — 已禁用（数据完整性优先）
  @Delete('transactions/:id')
  @ApiOperation({ summary: '物理删除（已禁用）' })
  async removeTx(@Param('id', ParseIntPipe) _id: number) {
    throw new BadRequestException('财务流水不允许物理删除，请用 POST /:id/reverse 反冲');
  }

  // 反冲流水 — 写反向 Tx + 回滚 source 单的 paid/received + 标原 Tx cancelled
  @Post('transactions/:id/reverse')
  @ApiOperation({ summary: '反冲流水（写反向 Tx + 重算 source 单 settle_status）' })
  async reverseTx(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) {
    return this.txRepo.manager.transaction(async mgr => {
      const orig = await mgr.findOne(PaymentTransaction, { where: { id } });
      if (!orig) throw new NotFoundException('流水不存在');
      if (orig.status === 'reversed') throw new BadRequestException('该流水已反冲');
      // 写反向
      const reverse = await mgr.save(mgr.create(PaymentTransaction, {
        account_id: orig.account_id,
        direction: orig.direction === 'in' ? 'out' : 'in',
        amount: orig.amount,
        source_type: `${orig.source_type}_reverse` as any,
        ref_order_id: orig.ref_order_id,
        ref_order_no: `RV-${orig.ref_order_no || orig.id}`,
        counter_party: orig.counter_party,
        operator_id: orig.operator_id,
        remark: `反冲 #${orig.id} (${body.reason || orig.remark || ''})`,
      }));
      // 标原 Tx 为 reversed
      await mgr.update(PaymentTransaction, id, {
        status: 'reversed',
        reversed_by_tx_id: reverse.id,
      });
      // 重算 source 单的 paid/received + settle_status
      if (orig.source_type === 'purchase' && orig.ref_order_id) {
        const po = await mgr.findOne('purchase_orders' as any, { where: { id: orig.ref_order_id } } as any) as any;
        if (po) {
          const newPaid = Math.max(0, po.paid_amount - orig.amount);
          const total = po.qty * po.cost_price;
          const newStatus = newPaid === 0 ? 'unpaid' : newPaid >= total ? 'done' : 'partial';
          await mgr.update('purchase_orders' as any, po.id, { paid_amount: newPaid, settle_status: newStatus });
        }
      } else if (orig.source_type === 'sale' && orig.ref_order_id) {
        const so = await mgr.findOne('sales_orders' as any, { where: { id: orig.ref_order_id } } as any) as any;
        if (so) {
          const newReceived = Math.max(0, so.received_amount - orig.amount);
          const total = so.qty * so.sale_price;
          const newStatus = newReceived === 0 ? 'unpaid' : newReceived >= total ? 'done' : 'partial';
          await mgr.update('sales_orders' as any, so.id, { received_amount: newReceived, receive_status: newStatus });
        }
      }
      return { ok: true, reversed: reverse };
    });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PaymentAccount, PaymentTransaction])],
  controllers: [FinanceController],
})
export class FinanceModule {}
