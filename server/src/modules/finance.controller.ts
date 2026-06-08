// FinanceController — 纯 HTTP 路由
import { Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreateAccountDto, UpdateAccountDto, CreateTransactionDto } from '../dto/finance-media.dto';

@ApiTags('财务')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  // 账户
  @Get('accounts') @ApiOperation({ summary: '账户列表' })
  listAccounts() { return this.svc.listAccounts(); }

  @Get('account/:id') @ApiOperation({ summary: '账户详情' })
  getAccount(@Param('id', ParseIntPipe) id: number) { return this.svc.getAccount(id); }

  @Post('accounts') @ApiOperation({ summary: '新建账户' })
  createAccount(@Body() body: CreateAccountDto) { return this.svc.createAccount(body); }

  @Put('accounts/:id') @ApiOperation({ summary: '更新账户' })
  updateAccount(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateAccountDto) { return this.svc.updateAccount(id, body); }

  @Delete('accounts/:id') @ApiOperation({ summary: '删除账户' })
  removeAccount(@Param('id', ParseIntPipe) id: number) { return this.svc.removeAccount(id); }

  // 流水
  @Get('transactions') @ApiOperation({ summary: '流水列表（可按 direction 过滤）' })
  listTx(@Query('direction') dir?: string) { return this.svc.listTx(dir); }

  @Get('receive') @ApiOperation({ summary: '收款流水' })
  listReceive() { return this.svc.listReceive(); }

  @Get('pay') @ApiOperation({ summary: '付款流水' })
  listPay() { return this.svc.listPay(); }

  @Post('transactions') @ApiOperation({ summary: '手工记账' })
  createTx(@Body() body: CreateTransactionDto) { return this.svc.createTx(body); }

  @Post('transactions/:id/reverse') @ApiOperation({ summary: '反冲流水（写反向 + 重算 source 单）' })
  reverseTx(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) { return this.svc.reverseTx(id, body); }

  @Delete('transactions/:id') @ApiOperation({ summary: '物理删除已禁用' })
  removeTx(@Param('id', ParseIntPipe) _id: number) {
    throw new BadRequestException('财务流水不允许物理删除，请用 POST /:id/reverse 反冲');
  }
}
