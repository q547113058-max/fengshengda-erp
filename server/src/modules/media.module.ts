// 媒体上传 — fileFilter 白名单 + 魔数二次校验 + UUID 文件名 + 限制大小
import { Module, Controller, Get, Post, Delete, Param, ParseIntPipe, Body, Query, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
// 魔数检测（自实现，避开 file-type v18 ESM 问题）
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { MediaAsset } from '../entities/media-asset.entity';
import { CreateMediaDto } from '../dto/finance-media.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// MIME 白名单
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
]);

/**
 * 自实现魔数检测 — 从 buffer 头 12 字节判断
 * 避开 file-type v18 ESM 依赖问题
 */
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A（8 字节固定头）
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
      && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WEBP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // MP4: 找到 ftyp 在 4-12 字节
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'video/mp4';
  // MOV: 同 MP4 但 brand 是 qt
  // (与 mp4 同头，只靠 brand 区分；演示允许 mp4/mov 同等)
  // WEBM: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}

@ApiTags('媒体')
@Controller('media')
export class MediaController {
  constructor(@InjectRepository(MediaAsset) private repo: Repository<MediaAsset>) {}

  @Get()
  @ApiOperation({ summary: '媒体列表' })
  list(@Query('type') type?: string, @Query('product_id') productId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (productId) where.product_id = +productId;
    return this.repo.find({ where, order: { id: 'ASC' } });
  }

  // 文件上传 — warehouse 或 boss 才允许
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('warehouse', 'boss')
  @ApiBearerAuth()
  @ApiOperation({ summary: '上传图片/视频（限 warehouse/boss）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, product_id: { type: 'integer' }, type: { type: 'string', enum: ['image', 'video'] }, uploader_id: { type: 'integer' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (_req, file, cb) => {
        // UUID 文件名 + 保留扩展名（防碰撞 + 防猜测）
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    // MIME 头检查（第一道）
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIMES.has(file.mimetype)) {
        return cb(new BadRequestException(`不支持的 MIME 类型: ${file.mimetype}`), false);
      }
      cb(null, true);
    },
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { product_id?: number; batch_id?: number; type?: 'image'|'video'; uploader_id?: number; remark?: string },
  ) {
    if (!file) throw new BadRequestException('未收到文件');
    if (!file.path) throw new BadRequestException('文件未写入磁盘');
    // 魔数二次校验（防 MIME 头伪装）— 用自实现 detectMimeFromBuffer
    const fs = require('fs');
    const buf = fs.readFileSync(file.path);
    const detected = detectMimeFromBuffer(buf);
    if (!detected || !ALLOWED_MIMES.has(detected)) {
      // 删已写盘文件 + 拒
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      throw new BadRequestException(`文件内容与扩展名不符（检测: ${detected || 'unknown'}）`);
    }
    const type = body.type || (detected.startsWith('video/') ? 'video' : 'image');
    return this.repo.save(this.repo.create({
      product_id: body.product_id,
      batch_id: body.batch_id,
      type,
      file_path: `/uploads/${file.filename}`,
      thumb: `/uploads/${file.filename}`,
      uploader_id: body.uploader_id,
      remark: body.remark,
    }));
  }

  // 直接登记（已上传到 OSS 后只记路径）— boss only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss')
  @ApiBearerAuth()
  @ApiOperation({ summary: '登记一条媒体记录（不实际传文件）' })
  create(@Body() body: CreateMediaDto) {
    return this.repo.save(this.repo.create(body));
  }

  // 删 — boss only
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss')
  @ApiBearerAuth()
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
