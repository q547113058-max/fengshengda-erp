// ProductsController — 纯 HTTP 路由 + DTO 验证
// 业务逻辑全在 ProductsService
import { Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductPriceDto, UpdatePriceDto } from '../dto/product.dto';

@ApiTags('产品')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '产品列表（含双税票价）' })
  list() { return this.svc.list(); }

  @Get(':id')
  @ApiOperation({ summary: '产品详情' })
  one(@Param('id', ParseIntPipe) id: number) { return this.svc.one(id); }

  @Get(':id/prices')
  @ApiOperation({ summary: '产品所有税票价' })
  pricesFor(@Param('id', ParseIntPipe) id: number) { return this.svc.pricesFor(id); }

  @Post()
  @ApiOperation({ summary: '创建产品（可同时挂 1%/9% 双票价）' })
  create(@Body() body: CreateProductDto) { return this.svc.create(body); }

  @Put(':id')
  @ApiOperation({ summary: '更新产品' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductDto) { return this.svc.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: '删除产品（含价格，事务回滚）' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Post(':id/prices')
  @ApiOperation({ summary: '为产品新增税票价' })
  addPrice(@Param('id', ParseIntPipe) id: number, @Body() body: ProductPriceDto) { return this.svc.addPrice(id, body); }

  @Put('prices/:priceId')
  @ApiOperation({ summary: '更新某条税票价' })
  updatePrice(@Param('priceId', ParseIntPipe) priceId: number, @Body() body: UpdatePriceDto) { return this.svc.updatePrice(priceId, body); }

  @Delete('prices/:priceId')
  @ApiOperation({ summary: '删除某条税票价' })
  deletePrice(@Param('priceId', ParseIntPipe) priceId: number) { return this.svc.deletePrice(priceId); }
}
