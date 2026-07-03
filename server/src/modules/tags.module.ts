import { Module, Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Tag } from '../entities/tag.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';

@ApiTags('标签')
@Controller('tags')
export class TagsController {
  constructor(@InjectRepository(Tag) private repo: Repository<Tag>) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '标签列表' })
  list() {
    return this.repo.find({ order: { sort_order: 'ASC' } });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  @ApiBearerAuth()
  create(@Body() body: Partial<Tag>) {
    return this.repo.save(this.repo.create(body));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<Tag>) {
    return this.repo.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  @ApiBearerAuth()
  async remove(@Param('id', ParseIntPipe) id: number) {
    const tag = await this.repo.findOne({ where: { id } });
    if (tag && !tag.can_delete) throw new Error('该标签不可删除');
    return this.repo.delete(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Tag])],
  controllers: [TagsController],
})
export class TagsModule {}
