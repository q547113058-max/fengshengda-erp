import { defineConfig, devices } from '@playwright/test';

// 跑命令：cd frontend && npx playwright test
// 用 chromium headless
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,           // 串行避免 MySQL 行冲突
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // 测试启动后端 + 前端（已用 pm2 跑着）
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: 'curl -sf http://localhost:3003/health && curl -sf http://localhost:5173/',
        url: 'http://localhost:5173/',
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
