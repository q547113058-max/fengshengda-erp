// 性能压测：8 个主要端点（GET 为主）
// 用法：npm run perf
// 产出：docs/perf.md 报告

import autocannon from 'autocannon';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.BASE || 'http://localhost:3003';
const CONNECTIONS = 20;  // 模拟 20 并发
const DURATION = 10;     // 每端点 10 秒

interface Result {
  endpoint: string;
  url: string;
  rps: number;          // req/s
  latencyAvg: number;   // ms
  latencyP99: number;   // ms
  errors: number;
  throughput: number;   // bytes/s
  non2xx: number;
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'boss', password: 'demo' }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const data: any = await res.json();
  return data.access_token;
}

async function bench(endpoint: string, url: string, headers: Record<string, string>): Promise<Result> {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: `${BASE}${url}`,
      connections: CONNECTIONS,
      duration: DURATION,
      headers,
    }, (err, result) => {
      if (err) return reject(err);
      const non2xx = result.non2xx || 0;
      resolve({
        endpoint,
        url,
        rps: Math.round(result.requests.average),
        latencyAvg: Number(result.latency.average.toFixed(2)),
        latencyP99: Number(result.latency.p99.toFixed(2)),
        errors: result.errors || 0,
        throughput: Math.round(result.throughput.average),
        non2xx,
      });
    });
    autocannon.track(instance);
  });
}

async function main() {
  console.log('🚀 性能压测 — 8 个主要端点');
  console.log(`   目标: ${BASE}`);
  console.log(`   并发: ${CONNECTIONS} | 时长: ${DURATION}s/端点`);
  console.log();

  // 1. 登录拿 token
  console.log('🔐 登录拿 token...');
  const token = await login();
  const authHdr = { Authorization: `Bearer ${token}` };

  // 2. 8 端点
  const endpoints: Array<{ name: string; url: string; headers?: Record<string, string> }> = [
    { name: 'Health 公开',          url: '/health' },
    { name: 'Products 列表',       url: '/api/products', headers: authHdr },
    { name: 'Customers 列表',      url: '/api/customers', headers: authHdr },
    { name: 'Suppliers 列表',      url: '/api/suppliers', headers: authHdr },
    { name: 'Purchase Orders',     url: '/api/purchase', headers: authHdr },
    { name: 'Sales Orders',        url: '/api/sales', headers: authHdr },
    { name: 'Inventory Batches',   url: '/api/inventory/batches', headers: authHdr },
    { name: 'Dashboard KPI',       url: '/api/dashboard/kpi', headers: authHdr },
  ];

  const results: Result[] = [];
  for (const ep of endpoints) {
    process.stdout.write(`   ${ep.name.padEnd(30)} ... `);
    try {
      const r = await bench(ep.name, ep.url, ep.headers || {});
      console.log(`${r.rps} req/s | p99 ${r.latencyP99}ms | non2xx ${r.non2xx}`);
      results.push(r);
    } catch (e: any) {
      console.log(`❌ ${e.message}`);
    }
  }

  // 3. 报告
  console.log();
  console.log('═'.repeat(80));
  console.log('  端点'.padEnd(28) + 'RPS'.padStart(8) + 'avg ms'.padStart(10) + 'p99 ms'.padStart(10) + 'errors'.padStart(10) + 'non2xx'.padStart(10));
  console.log('─'.repeat(80));
  for (const r of results) {
    console.log(
      `  ${r.endpoint.padEnd(26)}` +
      `${String(r.rps).padStart(8)}` +
      `${String(r.latencyAvg).padStart(10)}` +
      `${String(r.latencyP99).padStart(10)}` +
      `${String(r.errors).padStart(10)}` +
      `${String(r.non2xx).padStart(10)}`,
    );
  }
  console.log('═'.repeat(80));

  // 4. 写 docs/perf.md
  const ts = new Date().toISOString();
  const md = [
    '# 性能压测报告',
    '',
    `**测试时间**: ${ts}`,
    `**目标**: ${BASE}`,
    `**并发**: ${CONNECTIONS} | **时长**: ${DURATION}s / 端点`,
    `**压测工具**: autocannon 8`,
    `**后端**: NestJS 10 + MariaDB 10.11 + bcrypt + JWT + Throttler 1000/min`,
    '',
    '## 结果',
    '',
    '| 端点 | URL | RPS | avg ms | p99 ms | errors | non2xx |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...results.map(r =>
      `| ${r.endpoint} | \`${r.url}\` | ${r.rps} | ${r.latencyAvg} | ${r.latencyP99} | ${r.errors} | ${r.non2xx} |`,
    ),
    '',
    '## 评估',
    '',
    '- **目标 RPS**: ≥ 1000（中型 ERP 1 角色 + 50 操作）',
    '- **目标 p99**: < 100ms（ERP 操作响应应即时）',
    '',
    '如未达标可优化：',
    '1. 加 Redis 缓存（products / customers / dashboard/kpi）',
    '2. 加 DB 索引（已加 5 个：po_date/so_date/batch_status/tx_date/mv_date）',
    '3. 加 nginx gzip + HTTP/2（静态资源）',
    '4. 加 MySQL 连接池（默认 10 → 50）',
    '5. 启用 pm2 cluster mode（fork → cluster，CPU 核数实例）',
  ].join('\n');

  mkdirSync('../docs', { recursive: true });
  writeFileSync('../docs/perf.md', md);
  console.log(`\n✅ 报告写入 docs/perf.md`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
