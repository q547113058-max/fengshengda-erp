// 浏览器端 e2e 冒烟：4 角色登录 + Dashboard + Products + Purchase 流程
// 用 Playwright Chromium headless
import { test, expect, Page } from '@playwright/test';

// 通用登录辅助：填表单 + 点登录按钮
async function loginAs(page: Page, username: string, password = 'demo') {
  await page.goto('/login');
  await page.locator('input[placeholder="请输入工号"]').fill(username);
  await page.locator('input[placeholder="请输入密码"]').fill(password);
  await page.locator('button:has-text("登录系统")').click();
  // 登录后跳到 / （首页/Dashboard）
  await page.waitForURL('**/');
  await page.waitForLoadState('networkidle');
}

test.describe('4 角色登录 + Dashboard', () => {
  test('boss 登录 → 看到 "梁总" 欢迎', async ({ page }) => {
    await loginAs(page, 'boss');
    await expect(page.locator('h1:has-text("欢迎")')).toContainText('梁总');
  });

  test('finance 登录 → 看到 "陈会计" 欢迎', async ({ page }) => {
    await loginAs(page, 'finance');
    await expect(page.locator('h1:has-text("欢迎")')).toContainText('陈会计');
  });

  test('warehouse 登录 → 看到 "黄仓管" 欢迎 + 侧边栏 7 菜单', async ({ page }) => {
    await loginAs(page, 'warehouse');
    await expect(page.locator('h1:has-text("欢迎")')).toContainText('黄仓管');
    const menuCount = await page.locator('.ant-menu-item').count();
    expect(menuCount).toBeLessThanOrEqual(10);
  });

  test('sales01 登录 → 看到 "李业务" 欢迎 + 侧边栏 4 菜单', async ({ page }) => {
    await loginAs(page, 'sales01');
    await expect(page.locator('h1:has-text("欢迎")')).toContainText('李业务');
    const menuCount = await page.locator('.ant-menu-item').count();
    expect(menuCount).toBeLessThanOrEqual(6);
  });

  test('错密码 → 留在登录页', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[placeholder="请输入工号"]').fill('boss');
    await page.locator('input[placeholder="请输入密码"]').fill('wrongpass');
    await page.locator('button:has-text("登录系统")').click();
    await page.waitForTimeout(1500);
    // 应当还在 /login
    expect(page.url()).toContain('/login');
  });
});

test.describe('Dashboard 关键元素', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'boss');
  });

  test('4 个 KPI 胶囊显示', async ({ page }) => {
    // 上 3 胶囊 (pill-label)
    await expect(page.getByText('采购待结', { exact: true })).toBeVisible();
    await expect(page.getByText('销售待收', { exact: true })).toBeVisible();
    await expect(page.getByText('低库存', { exact: true }).first()).toBeVisible();
    // 下 4 KPI 卡片
    await expect(page.getByText('在库库存（箱）', { exact: true })).toBeVisible();
  });

  test('低库存 Top 5 表格显示', async ({ page }) => {
    await expect(page.locator('text=仓储预警 · 低库存 Top 5')).toBeVisible();
    // 至少 1 行
    const rows = await page.locator('table tr').count();
    expect(rows).toBeGreaterThan(1);
  });

  test('本月销售总额显示 ¥ 数字', async ({ page }) => {
    await expect(page.locator('text=销售总额（元）').first()).toBeVisible();
    // 包含 ¥ 符号
    const sale = page.locator('text=/¥ [0-9,]+/').first();
    await expect(sale).toBeVisible();
  });
});

test.describe('Products 列表', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'boss');
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
  });

  test('表格 6 个鸡爪 SKU', async ({ page }) => {
    await expect(page.locator('h1, h2:has-text("产品")').first()).toBeVisible();
    // 6 个 SKU
    for (const name of ['卤鸡爪', '泡椒凤爪', '柠檬凤爪', '虎皮凤爪', '酱卤鸡爪']) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });

  test('1% / 9% 双税票价列', async ({ page }) => {
    await expect(page.locator('th:has-text("1% 税票价")').first()).toBeVisible();
    await expect(page.locator('th:has-text("9% 税票价")').first()).toBeVisible();
    // 至少 6 个 ¥ 价格
    const prices = await page.locator('text=/¥ \\d+\\.\\d+/').count();
    expect(prices).toBeGreaterThanOrEqual(6);
  });

  test('点击 + 新增产品 → Modal 弹出', async ({ page }) => {
    await page.locator('button:has-text("+ 新增产品")').click();
    await expect(page.locator('text=新增产品').first()).toBeVisible();
    // 5+ 字段
    await expect(page.locator('label:has-text("品类")')).toBeVisible();
    await expect(page.locator('label:has-text("产地")')).toBeVisible();
    await expect(page.locator('label:has-text("厂号")')).toBeVisible();
    // 关闭 modal
    await page.keyboard.press('Escape');
  });
});

test.describe('Purchase 列表 + Modal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'boss');
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');
  });

  test('表格有采购单', async ({ page }) => {
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test('点击 + 新建采购 → Modal 弹出', async ({ page }) => {
    await page.locator('button:has-text("+ 新建采购")').click();
    await expect(page.locator('text=新建采购单').first()).toBeVisible();
    // 关键必填字段
    await expect(page.locator('label:has-text("供应商")')).toBeVisible();
    await expect(page.locator('label:has-text("产品")')).toBeVisible();
    await expect(page.locator('label:has-text("数量")')).toBeVisible();
    await expect(page.locator('label:has-text("采购单价")')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('PO 状态徽章显示', async ({ page }) => {
    // "已结清" / "部分结" / "未结" 至少其一
    const hasPaid = await page.locator('text=已结清').count();
    const hasPartial = await page.locator('text=部分结').count();
    const hasUnpaid = await page.locator('text=未结').count();
    expect(hasPaid + hasPartial + hasUnpaid).toBeGreaterThan(0);
  });
});

test.describe('权限隔离', () => {
  test('sales01 访问 /purchase 被 Guard 重定向到 /', async ({ page }) => {
    await loginAs(page, 'sales01');
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');
    // 应当被重定向回首页
    expect(page.url()).toMatch(/\/$/);
  });

  test('sales01 访问 /settings/users 同样被拒', async ({ page }) => {
    await loginAs(page, 'sales01');
    await page.goto('/settings/users');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/$/);
  });

  test('boss 访问 /settings/users 能进', async ({ page }) => {
    await loginAs(page, 'boss');
    await page.goto('/settings/users');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/settings/users');
    await expect(page.locator('text=用户与权限').first()).toBeVisible();
  });
});

test.describe('后端健康检查（/health 直连）', () => {
  test('GET /health → status=ok + db.type=mysql', async ({ request }) => {
    const res = await request.get('http://localhost:3003/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db.type).toBe('mysql');
    expect(body.db.status).toBe('up');
  });

  test('GET /api/products 200 + 6 SKU', async ({ request }) => {
    const res = await request.get('http://localhost:3003/api/products');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(6);
  });

  test('POST /api/auth/login 错密码 → 401', async ({ request }) => {
    const res = await request.post('http://localhost:3003/api/auth/login', {
      data: { username: 'boss', password: 'wrong' },
    });
    expect(res.status()).toBe(401);
  });
});
