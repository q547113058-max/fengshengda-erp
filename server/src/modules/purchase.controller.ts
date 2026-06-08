// PurchaseController — 纯 HTTP 路由
import { Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto, UpdatePurchaseDto, PayPurchaseDto } from '../dto/purchase-sales.dto';

@ApiTags('采购')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly svc: PurchaseService) {}

  @Get() @ApiOperation({ summary: '采购单列表' })
  list() { return this.svc.list(); }

  @Get(':id') @ApiOperation({ summary: '采购单详情' })
  one(@Param('id', ParseIntPipe) id: number) { return this.svc.one(id); }

  @Post() @ApiOperation({ summary: '创建采购单（自动建批次+流水+可选付款）' })
  create(@Body() body: CreatePurchaseDto) { return this.svc.create(body); }

  @Put(':id') @ApiOperation({ summary: '更新采购单' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePurchaseDto) { return this.svc.update(id, body); }

  @Delete(':id') @ApiOperation({ summary: '删除采购单（有关联付款则软删）' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Post(':id/pay') @ApiOperation({ summary: '采购付款（更新 paid + 写财务 Tx）' })
  pay(@Param('id', ParseIntPipe) id: number, @Body() body: PayPurchaseDto) { return this.svc.pay(id, body); }
}
