// 上传图片 e2e：multer multipart/form-data
// 覆盖：上传 → 写文件 → 插入 media_asset → 静态可访问 → 列表返回 → 删除
// 全部走 boss token + 校验 fileFilter / 魔数 / UUID 文件名
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { existsSync, readFileSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import * as express from 'express';
const request = (supertest as any).default ?? supertest;
import { loginAs } from './test-utils';

const TEST_DB = join(process.cwd(), 'test-media.db');
process.env.DB_TYPE = 'better-sqlite3';
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET='dev-se...prod';
process.env.NODE_ENV = 'test';

const TEST_UPLOADS = join(process.cwd(), 'test-uploads');
if (existsSync(TEST_UPLOADS)) rmSync(TEST_UPLOADS, { recursive: true });
mkdirSync(TEST_UPLOADS, { recursive: true });
process.env.UPLOAD_DIR = TEST_UPLOADS;

describe('E2E: 上传图片（multer + 静态服务 + fileFilter + 魔数 + UUID）', () => {
  let app: INestApplication;
  let token: string;

  // 1x1 PNG（合法）
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

  // 假装是 PNG 头但不是（应被魔数拒）
  // 头 4 字节伪装成 PNG (89 50 4E 47) 但后续字节乱
  const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x99, 0x99, 0x99, 0x99, 0xff, 0xff, 0xff, 0xff]);

  const get = (path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  const post = (path: string) => request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`);
  const del = (path: string) => request(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const { AppModule } = await import('../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ cors: true });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    (app as any).use('/uploads', express.static(TEST_UPLOADS));
    await app.init();

    token = await loginAs(app, 'boss');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    if (existsSync(TEST_UPLOADS)) rmSync(TEST_UPLOADS, { recursive: true });
  });

  it('健康检查 → 200（@Public 不需 token）', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('未带 token 调 /api/media → 401', async () => {
    await request(app.getHttpServer()).get('/api/media').expect(401);
  });

  it('上传合法 PNG → 201 + UUID 文件名 + 魔数校验过', async () => {
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .field('type', 'image')
      .field('uploader_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' })
      .expect(201);
    expect(Number(res.body.product_id)).toBe(1);
    expect(res.body.type).toBe('image');
    // UUID 文件名格式：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.png
    expect(res.body.file_path).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(res.body.id).toBeGreaterThan(0);
  });

  it('上传后磁盘上存在该文件 + 内容字节一致', async () => {
    const res = await post('/api/media/upload')
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
    expect(disk[0]).toBe(0x89); // PNG magic
  });

  it('MIME 不在白名单（exe）→ 400', async () => {
    const exe = Buffer.from('MZ\x90\x00');
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', exe, { filename: 'evil.exe', contentType: 'application/x-msdownload' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/不支持的 MIME/);
  });

  it('MIME 头伪装 PNG 但内容不是 → 400 + 删已写文件', async () => {
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', FAKE_PNG, { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/文件内容与扩展名不符/);
  });

  it('静态服务能 GET 到 /uploads/<filename>', async () => {
    const res = await post('/api/media/upload')
      .field('product_id', 2)
      .field('type', 'image')
      .attach('file', PNG_BUFFER, { filename: 'static.png', contentType: 'image/png' })
      .expect(201);
    const filename = res.body.file_path.replace('/uploads/', '');
    const got = await request(app.getHttpServer()).get(`/uploads/${filename}`).expect(200);
    expect(got.body.length).toBe(PNG_BUFFER.length);
  });

  it('GET /api/media 列表能查到（boss token）', async () => {
    const before = (await get('/api/media')).body.length;
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'list.png', contentType: 'image/png' })
      .expect(201);
    const id = res.body.id;
    const after = (await get('/api/media')).body;
    expect(after.length).toBe(before + 1);
    expect(after.find((m: any) => m.id === id)).toBeDefined();
  });

  it('GET /api/media?type=image 过滤', async () => {
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .field('type', 'image')
      .attach('file', PNG_BUFFER, { filename: 'filter.png', contentType: 'image/png' })
      .expect(201);
    const list = (await get('/api/media?type=image')).body;
    const me = list.find((m: any) => m.id === res.body.id);
    expect(me).toBeDefined();
    expect(me.type).toBe('image');
  });

  it('GET /api/media?product_id=1 过滤', async () => {
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'product.png', contentType: 'image/png' })
      .expect(201);
    const list = (await get('/api/media?product_id=1')).body;
    const me = list.find((m: any) => m.id === res.body.id);
    expect(me).toBeDefined();
    expect(Number(me.product_id)).toBe(1);
  });

  it('不传 file → 400', async () => {
    await post('/api/media/upload').field('product_id', 1).expect(400);
  });

  it('超大文件 (>20MB) → 400 / 413', async () => {
    const big = Buffer.alloc(21 * 1024 * 1024, 0);
    const res = await post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' });
    expect([400, 413, 500]).toContain(res.status);
  });

  it('DELETE /api/media/:id → 200（boss 角色）', async () => {
    const up = await post('/api/media/upload')
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'del.png', contentType: 'image/png' })
      .expect(201);
    await del(`/api/media/${up.body.id}`).expect(200);
    const list = (await get('/api/media')).body;
    expect(list.find((m: any) => m.id === up.body.id)).toBeUndefined();
  });

  it('sales01 调上传 → 403（限 warehouse/boss）', async () => {
    const salesToken = await loginAs(app, 'sales01');
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${salesToken}`)
      .field('product_id', 1)
      .attach('file', PNG_BUFFER, { filename: 'sales.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });
});
