# 性能压测报告

**测试时间**: 2026-06-07T13:41:14.345Z
**目标**: http://localhost:3003
**并发**: 20 | **时长**: 10s / 端点
**压测工具**: autocannon 8
**后端**: NestJS 10 + MariaDB 10.11 + bcrypt + JWT + Throttler 1000/min

## 结果

| 端点 | URL | RPS | avg ms | p99 ms | errors | non2xx |
|---|---|---:|---:|---:|---:|---:|
| Health 公开 | `/health` | 1643 | 11.67 | 23 | 0 | 0 |
| Products 列表 | `/api/products` | 1631 | 11.75 | 32 | 0 | 16946 |
| Customers 列表 | `/api/customers` | 1769 | 10.81 | 22 | 0 | 18462 |
| Suppliers 列表 | `/api/suppliers` | 1759 | 10.86 | 21 | 0 | 18352 |
| Purchase Orders | `/api/purchase` | 1719 | 11.14 | 24 | 0 | 17907 |
| Sales Orders | `/api/sales` | 1732 | 11.06 | 23 | 0 | 16318 |
| Inventory Batches | `/api/inventory/batches` | 1727 | 11.09 | 23 | 0 | 18002 |
| Dashboard KPI | `/api/dashboard/kpi` | 1484 | 12.94 | 47 | 0 | 15327 |

## 评估

- **目标 RPS**: ≥ 1000（中型 ERP 1 角色 + 50 操作）
- **目标 p99**: < 100ms（ERP 操作响应应即时）

如未达标可优化：
1. 加 Redis 缓存（products / customers / dashboard/kpi）
2. 加 DB 索引（已加 5 个：po_date/so_date/batch_status/tx_date/mv_date）
3. 加 nginx gzip + HTTP/2（静态资源）
4. 加 MySQL 连接池（默认 10 → 50）
5. 启用 pm2 cluster mode（fork → cluster，CPU 核数实例）