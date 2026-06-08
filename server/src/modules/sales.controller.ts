// SalesController — 纯 HTTP 路由 + DTO 验证
import { Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SalesService } from './sales.service';
import { CreateSalesDto, UpdateSalesDto, ReceiveSaleDto } from '../dto/purchase-sales.dto';

@ApiTags('销售')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly svc: SalesService) {}

  @Get() @ApiOperation({ summary: '销售单列表' })
  list() { return this.svc.list(); }

  @Get(':id') @ApiOperation({ summary: '销售单详情' })
  one(@Param('id', ParseIntPipe) id: number) { return this.svc.one(id); }

  @Post() @ApiOperation({ summary: '创建销售单（事务+行锁防超卖）' })
  create(@Body() body: CreateSalesDto) { return this.svc.create(body); }

  @Put(':id') @ApiOperation({ summary: '更新销售单（已收款禁改核心字段）' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSalesDto) { return this.svc.update(id, body); }

  @Post(':id/reverse') @ApiOperation({ summary: '反冲销售单（恢复库存+反向流水+撤销佣金）' })
  reverse(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) { return this.svc.reverse(id, body); }

  @Post(':id/receive') @ApiOperation({ summary: '销售收款（事务内更新+写财务 Tx）' })
  receive(@Param('id', ParseIntPipe) id: number, @Body() body: ReceiveSaleDto) { return this.svc.receive(id, body); }

  @Delete(':id') @ApiOperation({ summary: '物理删除已禁用' })
  remove(@Param('id', ParseIntPipe) _id: number) {
    throw new BadRequestException('物理删除已禁用，请用 POST /:id/reverse 反冲。数据完整性优先。');
  }
}
