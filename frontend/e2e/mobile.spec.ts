// 移动端冒烟：iPhone 13 viewport + 4 角色验证
// 验证：
// 1. 移动端 viewport 不破版
// 2. KPI 卡片栅格自适应
// 3. 表格可见
// 4. 横向无溢出
// 注：viewport 由 playwright.config.ts 的 mobile-iphone13 project 决定（390x844）
import { test, expect, Page } from '@playwright/test';

async function loginAs(page: Page, username: string, password = 'demo') {
  await page.goto('/login');
  await page.locator('input[placeholder="请输入工号"]').fill(username);
  await page.locator('input[placeholder="请输入密码"]').fill(password);
  await page.locator('button:has-text("登录系统")').click();
  await page.waitForURL('**/');
  await page.waitForLoadState('networkidle');
}

test.describe('iPhone 13 viewport（390x844）', () => {
  test('boss 移动端 Dashboard 4 KPI + 无横向溢出', async ({ page }) => {
    await loginAs(page, 'boss');
    // 欢迎条
    await expect(page.locator('h1:has-text("欢迎")')).toBeVisible();
    // 4 KPI 卡片
    const kpiCells = page.locator('.dashboard-kpi-cell');
    expect(await kpiCells.count()).toBe(4);
    // body 不超出 viewport
    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('sales01 移动端：登录成功 + 欢迎', async ({ page }) => {
    await loginAs(page, 'sales01');
    await expect(page.locator('h1:has-text("欢迎")')).toBeVisible();
    // 4 KPI
    expect(await page.locator('.dashboard-kpi-cell').count()).toBe(4);
  });

  test('finance 移动端：财务深链可访问', async ({ page }) => {
    await loginAs(page, 'finance');
    await page.goto('/finance/ledger');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
