// e2e 测试公共工具 — 自动登录拿 token，所有请求都带 Authorization
import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';

export type Role = 'boss' | 'admin' | 'finance' | 'warehouse' | 'sales';

const ACCOUNTS: Record<string, string> = {
  boss: 'demo',
  finance: 'demo',
  warehouse: 'demo',
  sales01: 'demo',
  sales02: 'demo',
};

// 缓存 token（同一 app 内复用，避免 5 req/min 限流爆）
const tokenCache = new Map<string, string>();

/**
 * 登录拿 access_token（缓存复用）
 */
export async function loginAs(
  app: INestApplication,
  username: string,
): Promise<string> {
  const cached = tokenCache.get(username);
  if (cached) return cached;
  const password = ACCOUNTS[username] || 'demo';
  const req = ((supertest as any).default ?? supertest) as any;
  const res = await req(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username, password })
    .expect(201);
  const token = res.body.access_token;
  if (!token) throw new Error(`登录 ${username} 没拿到 access_token`);
  tokenCache.set(username, token);
  return token;
}

/**
 * 清 token 缓存（不同 e2e 文件独立）
 */
export function clearTokenCache() {
  tokenCache.clear();
}

/**
 * 拿一个带 Authorization 的 supertest agent
 */
export async function authedAgent(app: INestApplication, username: string) {
  const token = await loginAs(app, username);
  const req = ((supertest as any).default ?? supertest) as any;
  return {
    get: (path: string) =>
      req(app.getHttpServer())
        .get(`/api${path.startsWith('/') ? path : '/' + path}`)
        .set('Authorization', `Bearer ${token}`),
    post: (path: string) =>
      req(app.getHttpServer())
        .post(`/api${path.startsWith('/') ? path : '/' + path}`)
        .set('Authorization', `Bearer ${token}`),
    put: (path: string) =>
      req(app.getHttpServer())
        .put(`/api${path.startsWith('/') ? path : '/' + path}`)
        .set('Authorization', `Bearer ${token}`),
    delete: (path: string) =>
      req(app.getHttpServer())
        .delete(`/api${path.startsWith('/') ? path : '/' + path}`)
        .set('Authorization', `Bearer ${token}`),
  };
}
