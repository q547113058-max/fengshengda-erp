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

  @Delete('transactions/:id')
  async removeTx(@Param('id', ParseIntPipe) id: number) {
    await this.txRepo.delete(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PaymentAccount, PaymentTransaction])],
  controllers: [FinanceController],
})
export class FinanceModule {}
