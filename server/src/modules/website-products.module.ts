import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, Query, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebsiteProduct } from '../entities/website-product.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Public } from '../common/public.decorator';

@ApiTags('官网产品')
@Controller('website-products')
export class WebsiteProductsController {
  constructor(@InjectRepository(WebsiteProduct) private repo: Repository<WebsiteProduct>) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '官网产品列表' })
  list() {
    return this.repo.find({ order: { id: 'DESC' } });
  }

  @Get(':id')
  @ApiOperation({ summary: '官网产品详情' })
  one(@Param('id', ParseIntPipe) id: number) {
    return this.repo.findOne({ where: { id } });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增官网产品' })
  create(@Body() body: Partial<WebsiteProduct>) {
    return this.repo.save(this.repo.create(body));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新官网产品' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<WebsiteProduct>) {
    return this.repo.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除官网产品' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.repo.delete(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteProduct])],
  controllers: [WebsiteProductsController],
})
export class WebsiteProductsModule {}
