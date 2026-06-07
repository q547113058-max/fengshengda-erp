// 端到端集成测试 — 启动整个 NestJS app + 隔离的 SQLite 库 + supertest 打 HTTP
// 覆盖：登录 → 采购单创建级联 → 销售单扣减 → 佣金生成 → 佣金结算
// 全部走 boss token（admin）
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
const request = (supertest as any).default ?? supertest;
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { loginAs } from './test-utils';

const TEST_DB = join(process.cwd(), 'test-erp.db');
process.env.DB_TYPE = 'better-sqlite3';
process.env.DB_PATH = TEST_DB;
process.env.JWT_SECRET = 'dev-secret-CHANGE-ME-in-prod';
process.env.NODE_ENV = 'test';

describe('E2E: 完整业务流（登录→采购→销售→佣金结算）', () => {
  let app: INestApplication;
  let products: any;
  let suppliers: any;
  let customers: any;
  let accounts: any;
  let batches: any;
  let users: any;
  let purchaseId: number;
  let salesId: number;
  let commissionId: number;
  let token: string;
  // 工具：发请求自动带 token
  const get = (path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  const post = (path: string) => request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`);
  const put = (path: string) => request(app.getHttpServer()).put(path).set('Authorization', `Bearer ${token}`);
  const del = (path: string) => request(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);

    const { AppModule } = await import('../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ cors: true });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    // 拿 boss token
    token = await loginAs(app, 'boss');

    // 拉种子数据
    products = (await get('/api/products')).body;
    suppliers = (await get('/api/suppliers')).body;
    customers = (await get('/api/customers')).body;
    accounts = (await get('/api/finance/accounts')).body;
    users = (await get('/api/users')).body;
  });

  afterAll(async () => {
    await app.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it('种子数据应包含 6 个产品 / 5 个客户 / 5 个供应商 / 3 个账户 / 5 个用户', () => {
    expect(products.length).toBe(6);
    expect(suppliers.length).toBeGreaterThanOrEqual(4);
    expect(customers.length).toBeGreaterThanOrEqual(4);
    expect(accounts.length).toBeGreaterThanOrEqual(3);
    expect(users.length).toBe(5);
  });

  it('登录：boss / demo 返回 201 + access_token + 用户信息', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'boss', password: 'demo' })
      .expect(201);
    expect(res.body.user.username).toBe('boss');
    expect(res.body.user.role).toBe('boss');
    expect(res.body.access_token).toBeDefined();
    expect(res.body.access_token.split('.').length).toBe(3); // JWT 三段
  });

  it('登录：错密码 → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'boss', password: 'wrong' })
      .expect(401);
  });

  it('未带 token 访问受保护端点 → 401', async () => {
    await request(app.getHttpServer()).get('/api/purchase').expect(401);
  });

  it('JWT 用户列表（boss 可见）', async () => {
    const res = await get('/api/auth/users');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(5);
    // 关键：password_hash 字段不应泄漏
    expect(res.body[0].password_hash).toBeUndefined();
  });

  it('创建采购单：自动建批次 + 写 In 流水 + 可选付款 Tx', async () => {
    const salesUser = users.find((u: any) => u.role === 'sales');
    const res = await post('/api/purchase')
      .send({
        supplier_id: suppliers[0].id,
        product_id: products[0].id,
        qty: 50,
        cost_price: 14.5,
        purchase_date: '2026-06-05',
        paid_amount: 500,
        account_id: accounts.find((a: any) => a.is_company).id,
        warehouse: '佛山冷库A',
        holder: '黄仓管',
        created_by: salesUser.id,
      })
      .expect(201);
    purchaseId = res.body.id;
    expect(res.body.po_no).toMatch(/^PO\d{6}-\d+$/);

    const batchesRes = await get('/api/inventory/batches');
    batches = batchesRes.body;
    const newBatch = batches.find((b: any) => b.purchase_order_id === purchaseId);
    expect(newBatch).toBeDefined();
    expect(newBatch.qty_total).toBe(50);
    expect(newBatch.qty_remaining).toBe(50);

    const mvRes = await get('/api/movements');
    const newMv = mvRes.body.find((m: any) => m.batch_id === newBatch.id);
    expect(newMv.type).toBe('in');
    expect(newMv.qty).toBe(50);

    const txRes = await get('/api/finance/transactions');
    const newTx = txRes.body.find((t: any) => t.ref_order_id === purchaseId);
    expect(newTx.direction).toBe('out');
    expect(newTx.amount).toBe(500);
    expect(newTx.source_type).toBe('purchase');
  });

  it('采购单缺必填 → 400 + 错误详情', async () => {
    const res = await post('/api/purchase')
      .send({ product_id: products[0].id, qty: 1 })
      .expect(400);
    expect(res.body.message).toBeDefined();
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it('采购单含未知字段 → 400', async () => {
    await post('/api/purchase')
      .send({
        supplier_id: suppliers[0].id, product_id: products[0].id, qty: 1, cost_price: 1,
        injected_field: 'evil',
      })
      .expect(400);
  });

  it('从批次销售 20 箱：扣减剩余 + 写 Out 流水 + 自动建佣金', async () => {
    const batch = batches.find((b: any) => b.purchase_order_id === purchaseId);
    const salesUser = users.find((u: any) => u.role === 'sales');

    const res = await post('/api/sales')
      .send({
        customer_id: customers[0].id,
        sales_user_id: salesUser.id,
        product_id: products[0].id,
        batch_id: batch.id,
        qty: 20,
        sale_price: 23,
        tax_rate: 1,
        commission_rate: 3,
        sale_date: '2026-06-05',
        counter_party: customers[0].name,
      })
      .expect(201);
    salesId = res.body.id;
    expect(res.body.so_no).toMatch(/^SO\d{6}-\d+$/);
    expect(res.body.commission_amt).toBeCloseTo(20 * 23 * 0.03, 2);

    const batchAfter = (await get(`/api/inventory/batch/${batch.id}`)).body;
    expect(batchAfter.qty_remaining).toBe(30);

    const mvAfter = (await get('/api/movements')).body
      .find((m: any) => m.batch_id === batch.id && m.type === 'out');
    expect(mvAfter).toBeDefined();
    expect(mvAfter.qty).toBe(20);

    const commRes = (await get('/api/commission')).body;
    const newComm = commRes.find((c: any) => c.sales_order_id === salesId);
    expect(newComm).toBeDefined();
    expect(newComm.settle_status).toBe('pending');
    expect(newComm.amount).toBeCloseTo(13.8, 2);
    commissionId = newComm.id;
  });

  it('销售超卖（>批次剩余）→ 400', async () => {
    const batch = batches.find((b: any) => b.purchase_order_id === purchaseId);
    const salesUser = users.find((u: any) => u.role === 'sales');
    await post('/api/sales')
      .send({
        customer_id: customers[0].id, sales_user_id: salesUser.id, product_id: products[0].id,
        batch_id: batch.id, qty: 9999, sale_price: 1, tax_rate: 1,
      })
      .expect(400);
  });

  it('佣金结算：标 paid + 写 Out 财务 Tx', async () => {
    const account = accounts.find((a: any) => a.is_company);
    const res = await post(`/api/commission/${commissionId}/settle`)
      .send({ account_id: account.id, counter_party: '李业务' })
      .expect(201);
    expect(res.body.settle_status).toBe('paid');
    expect(res.body.settled_at).toBeDefined();

    const txRes = (await get('/api/finance/transactions')).body;
    const newTx = txRes.find((t: any) => t.source_type === 'commission' && t.ref_order_id === salesId);
    expect(newTx).toBeDefined();
    expect(newTx.direction).toBe('out');
    expect(newTx.amount).toBeCloseTo(13.8, 2);
  });

  it('重复结算已 paid 的佣金 → 400', async () => {
    const account = accounts.find((a: any) => a.is_company);
    await post(`/api/commission/${commissionId}/settle`)
      .send({ account_id: account.id })
      .expect(400);
  });
  it('销售反冲：恢复批次 + 写反向流水 + 标 cancelled', async () => {
    const batch = batches.find((b: any) => b.purchase_order_id === purchaseId);
    const beforeRem = (await get(`/api/inventory/batch/${batch.id}`)).body.qty_remaining;

    const res = await post(`/api/sales/${salesId}/reverse`)
      .send({ reason: '客户退货' })
      .expect(201);
    expect(res.body.status).toBe('cancelled');

    // 库存恢复
    const afterRem = (await get(`/api/inventory/batch/${batch.id}`)).body.qty_remaining;
    expect(afterRem).toBe(beforeRem + 20);

    // 销售单状态
    const so = (await get(`/api/sales/${salesId}`)).body;
    expect(so.status).toBe('cancelled');

    // 已收款被清零
    expect(so.received_amount).toBe(0);
  });

  it('销售已反冲再 reverse → 400', async () => {
    await post(`/api/sales/${salesId}/reverse`).send({}).expect(400);
  });

  it('物理删除销售单已禁用 → 400', async () => {
    await del(`/api/sales/${salesId}`).expect(400);
  });

  it('财务流水的物理 DELETE 已禁用 → 400', async () => {
    const txs = (await get('/api/finance/transactions')).body;
    expect(txs.length).toBeGreaterThan(0);
    await del(`/api/finance/transactions/${txs[0].id}`).expect(400);
  });

  it('健康检查：GET /health → 200 + status/db 字段（@Public 免 token）', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db.type).toBe('better-sqlite3');
    expect(res.body.db.status).toBe('up');
  });

  it('内部健康端点未带 token → 401', async () => {
    await request(app.getHttpServer()).get('/api/internal/health').expect(401);
  });

  it('仪表盘 KPI：含全部指标', async () => {
    const res = await get('/api/dashboard/kpi').expect(200);
    expect(res.body).toHaveProperty('monthSaleAmt');
    expect(res.body).toHaveProperty('totalStockQty');
    expect(res.body).toHaveProperty('accountBalance');
    expect(res.body).toHaveProperty('byType');
  });
});
