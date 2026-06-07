import { Module, Controller, Get, Post, Delete, Param, ParseIntPipe, Body, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MediaAsset } from '../entities/media-asset.entity';
import { CreateMediaDto } from '../dto/finance-media.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

@ApiTags('媒体')
@Controller('media')
class MediaController {
  constructor(@InjectRepository(MediaAsset) private repo: Repository<MediaAsset>) {}

  @Get()
  list(@Query('type') type?: string, @Query('product_id') productId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (productId) where.product_id = +productId;
    return this.repo.find({ where, order: { id: 'ASC' } });
  }

  // 文件上传
  @Post('upload')
  @ApiOperation({ summary: '上传文件到 server/uploads（multipart/form-data）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, product_id: { type: 'integer' }, type: { type: 'string', enum: ['image', 'video'] }, uploader_id: { type: 'integer' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (_req, file, cb) => {
        const ts = Date.now();
        const ext = extname(file.originalname) || '.jpg';
        cb(null, `${ts}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { product_id?: number; type?: 'image'|'video'; uploader_id?: number },
  ) {
    if (!file) throw new BadRequestException('未收到文件');
    const type = body.type || (file.mimetype.startsWith('video/') ? 'video' : 'image');
    return this.repo.save(this.repo.create({
      product_id: body.product_id,
      type,
      file_path: `/uploads/${file.filename}`,
      thumb: `/uploads/${file.filename}`,
      uploader_id: body.uploader_id,
    }));
  }

  // 直接登记（已上传到 OSS 后只记路径）
  @Post()
  @ApiOperation({ summary: '登记一条媒体记录（不实际传文件）' })
  create(@Body() body: CreateMediaDto) {
    return this.repo.save(this.repo.create(body));
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [MediaController],
})
export class MediaModule {}
