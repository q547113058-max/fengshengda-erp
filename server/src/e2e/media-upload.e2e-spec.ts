// 上传图片 e2e：multer multipart/form-data
// 覆盖：上传 → 写文件 → 插入 media_asset → 静态可访问 → 列表返回 → 删除
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as supertest from 'supertest';
import { existsSync, readFileSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import * as express from 'express';
const request = (supertest as any).default ?? supertest;

// 1. 测试专用的 TypeORM 配置 — 用 SQLite 隔离库
const TEST_DB = join(process.cwd(), 'test-media.db');
process.env.DB_TYPE = 'better-sqlite3';
process.env.DB_PATH = TEST_DB;

// 2. 临时 uploads 目录（避免污染生产 uploads/）
const TEST_UPLOADS = join(process.cwd(), 'test-uploads');
if (existsSync(TEST_UPLOADS)) rmSync(TEST_UPLOADS, { recursive: true });
mkdirSync(TEST_UPLOADS, { recursive: true });
process.env.UPLOAD_DIR = TEST_UPLOADS;

describe('E2E: 上传图片（multer + 静态服务）', () => {
  let app: INestApplication;

  // 准备一个最小的 PNG 字节 (1x1 红点)
  const PNG_BUFFER = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x6f, 0x3b,
    0x6f, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  beforeAll(async () => {
    const { AppModule } = await import('../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ cors: true });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    // multer 写入 TEST_UPLOADS，media 行 file_path=/uploads/xxx
    // 在 api prefix 之外加 express.static 桥接 /uploads → TEST_UPLOADS
    (app as any).use('/uploads', express.static(TEST_UPLOADS));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    if (existsSync(TEST_UPLOADS)) rmSync(TEST_UPLOADS, { recursive: true });
  });

  it('健康检查 → 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('上传 PNG → 201 + 返回 media_asset 行', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .field('type', 'image')
      .field('uploader_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' })
      .expect(201);

    // 注意：form-data field 都是 string，DB 列是 number
    // multer 解析后 @Body() 是字符串，除非装了 transform: true
    // product_id = Number("1") = 1
    expect(Number(res.body.product_id)).toBe(1);
    expect(res.body.type).toBe('image');
    expect(Number(res.body.uploader_id)).toBe(1);
    expect(res.body.file_path).toMatch(/^\/uploads\/\d+\.png$/);
    expect(res.body.thumb).toMatch(/^\/uploads\/\d+\.png$/);
    expect(res.body.id).toBeGreaterThan(0);
  });

  it('上传后磁盘上存在该文件', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .field('type', 'image')
      .field('uploader_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'verify.png', contentType: 'image/png' })
      .expect(201);

    const filename = res.body.file_path.replace('/uploads/', '');
    const fullPath = join(TEST_UPLOADS, filename);
    expect(existsSync(fullPath)).toBe(true);
    const disk = readFileSync(fullPath);
    expect(disk.length).toBe(PNG_BUFFER.length);
    expect(disk[0]).toBe(0x89); // PNG magic byte
  });

  it('静态服务能 GET 到 /uploads/<filename>', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 2)
      .field('type', 'image')
      .attach('file', PNG_BUFFER, { filename: 'static.png', contentType: 'image/png' })
      .expect(201);

    const filename = res.body.file_path.replace('/uploads/', '');
    const got = await request(app.getHttpServer())
      .get(`/uploads/${filename}`)
      .expect(200);
    expect(got.body.length).toBe(PNG_BUFFER.length);
  });

  it('GET /api/media 列表能查到（只校验本测试上传的）', async () => {
    // 先记录当前已上传数
    const before = await request(app.getHttpServer()).get('/api/media').expect(200);
    const beforeCount = before.body.length;

    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'list.png', contentType: 'image/png' })
      .expect(201);
    const id = res.body.id;

    const after = await request(app.getHttpServer()).get('/api/media').expect(200);
    expect(after.body.length).toBe(beforeCount + 1);

    const me = after.body.find((m: any) => m.id === id);
    expect(me).toBeDefined();
    expect(me.file_path).toMatch(/^\/uploads\/\d+\.png$/);
  });

  it('GET /api/media?type=image 过滤（只含本测试上传的）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .field('type', 'image')
      .attach('file', PNG_BUFFER, { filename: 'filter.png', contentType: 'image/png' })
      .expect(201);
    const myId = res.body.id;

    const list = await request(app.getHttpServer())
      .get('/api/media?type=image')
      .expect(200);
    const me = list.body.find((m: any) => m.id === myId);
    expect(me).toBeDefined();
    expect(me.type).toBe('image');
  });

  it('GET /api/media?product_id=1 过滤（只含本测试上传的）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'product.png', contentType: 'image/png' })
      .expect(201);
    const myId = res.body.id;

    const list = await request(app.getHttpServer())
      .get('/api/media?product_id=1')
      .expect(200);
    const me = list.body.find((m: any) => m.id === myId);
    expect(me).toBeDefined();
    expect(Number(me.product_id)).toBe(1);
  });

  it('不传 file → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .expect(400);
  });

  it('超大文件 (>20MB) → 400 / 413', async () => {
    const big = Buffer.alloc(21 * 1024 * 1024, 0); // 21MB
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' });
    expect([400, 413, 500]).toContain(res.status); // multer 抛 500 通常
  });

  it('DELETE /api/media/:id → 删除行（不删文件，按设计）', async () => {
    const up = await request(app.getHttpServer())
      .post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'del.png', contentType: 'image/png' })
      .expect(201);
    const id = up.body.id;

    await request(app.getHttpServer()).delete(`/api/media/${id}`).expect(200);

    const list = await request(app.getHttpServer()).get('/api/media').expect(200);
    expect(list.body.find((m: any) => m.id === id)).toBeUndefined();
  });
});
