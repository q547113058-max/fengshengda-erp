import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, NotFoundException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { CreateProductDto, UpdateProductDto, ProductPriceDto, UpdatePriceDto } from '../dto/product.dto';

@ApiTags('产品')
@Controller('products')
class ProductsController {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(ProductPrice) private prices: Repository<ProductPrice>,
  ) {}

  @Get()
  @ApiOperation({ summary: '产品列表（含双税票价）' })
  async list() {
    const products = await this.products.find({ order: { id: 'ASC' } });
    const prices = await this.prices.find();
    return products.map(p => ({
      ...p,
      prices: prices.filter(pr => pr.product_id === p.id),
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: '产品详情' })
  async one(@Param('id', ParseIntPipe) id: number) {
    const p = await this.products.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return p;
  }

  @Get(':id/prices')
  @ApiOperation({ summary: '产品所有税票价' })
  async pricesFor(@Param('id', ParseIntPipe) id: number) {
    return this.prices.find({ where: { product_id: id }, order: { tax_rate: 'ASC' } });
  }

  @Post()
  @ApiOperation({ summary: '创建产品（可同时挂 1%/9% 双票价）' })
  async create(@Body() body: CreateProductDto) {
    const { prices, ...productData } = body;
    const product = await this.products.save(this.products.create(productData));
    if (prices?.length) {
      await this.prices.save(prices.map(p => this.prices.create({ ...p, product_id: product.id })));
    }
    return this.products.findOne({ where: { id: product.id } });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新产品' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductDto) {
    await this.products.update(id, body);
    return this.products.findOne({ where: { id } });
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除产品（含价格）' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prices.delete({ product_id: id });
    await this.products.delete(id);
    return { ok: true };
  }

  @Post(':id/prices')
  @ApiOperation({ summary: '为产品新增税票价' })
  async addPrice(@Param('id', ParseIntPipe) id: number, @Body() body: ProductPriceDto) {
    return this.prices.save(this.prices.create({ ...body, product_id: id }));
  }

  @Put('prices/:priceId')
  @ApiOperation({ summary: '更新某条税票价' })
  async updatePrice(@Param('priceId', ParseIntPipe) priceId: number, @Body() body: UpdatePriceDto) {
    await this.prices.update(priceId, body);
    return this.prices.findOne({ where: { id: priceId } });
  }

  @Delete('prices/:priceId')
  @ApiOperation({ summary: '删除某条税票价' })
  async deletePrice(@Param('priceId', ParseIntPipe) priceId: number) {
    await this.prices.delete(priceId);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductPrice])],
  controllers: [ProductsController],
})
export class ProductsModule {}
