# 丰晟达 ERP · 鸡爪供应链管理系统

> 4 角色 · 13 表 · 14 REST 控制器 · 20 业务页面 · 35 测试
> 品牌：开平市丰晟达食品有限公司 · 鸡爪业务（卤鸡爪 / 泡椒凤爪 / 柠檬凤爪 / 虎皮凤爪 / 酱卤鸡爪 / 盐焗鸡爪）
> 一套覆盖老板、财务、仓库、业务员全流程的 ERP 云端后台

---

## 📑 目录

- [项目亮点](#-项目亮点)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [数据库设计](#-数据库设计)
- [角色与权限](#-角色与权限)
- [API 文档（Swagger）](#-api-文档swagger)
- [测试](#-测试)
- [PM2 进程管理](#-pm2-进程管理)
- [Docker 部署](#-docker-部署)
- [CI/CD](#-cicd)
- [数据库切换（MySQL / SQLite）](#-数据库切换mysql--sqlite)
- [开发约定](#-开发约定)
- [数据域切换](#-数据域切换)
- [故障排查](#-故障排查)
- [License](#-license)

---

## ✨ 项目亮点

- **完整业务流** — 采购自动建批次 → 销售扣减批次 → 自动算佣金 → 佣金结算写财务 → 5 种账户进出账，**全在一个事务里**保证一致
- **20 个业务页面** + **4 角色权限菜单**（老板看全部 / 财务管钱 / 仓库管物 / 业务员只看自己的客户和佣金）
- **2 种税票价格**（1% / 9%）+ **5 种支付账户**（公账 / 微信私户 / 支付宝 / 现金 / 其他）
- **14 个 REST 控制器**全部接通 DTO 验证（class-validator）+ Swagger 文档
- **23 单元测试 + 12 e2e 集成测试**（覆盖登录 / 采购级联 / 销售扣减 / 佣金自动建 / 佣金结算 / 超卖拦截 / DTO 拦截 / 仪表盘）
- **4 层部署体系**：本地 vite dev → pm2 守护 → docker compose → 生产 nginx

---

## 🧰 技术栈

| 层 | 技术 |
|---|---|
| **前端** | Vite 5 + React 18 + TypeScript 5 + Ant Design 5 + Zustand 4 |
| **后端** | NestJS 10 + TypeORM 0.3 + class-validator 0.14 + Swagger 7 |
| **数据库** | MySQL 8 / MariaDB 10.11（生产）+ SQLite（开发 / 测试） |
| **测试** | Jest 29 + ts-jest + supertest（45 后端 case：23 单测 + 22 e2e）/ Playwright（21 浏览器冒烟） |
| **部署** | Docker + docker-compose + nginx 1.27 反代 |
| **进程守护** | pm2 7 + pm2-logrotate |
| **CI** | GitHub Actions（5 job: backend / frontend / docker / compose-smoke / playwright） |
| **依赖更新** | Dependabot（每周自动 PR） |

---

## 🚀 快速开始

### 方式 1：本地开发（推荐）

**前置**：Node.js 20+、MariaDB 10.11+ 或 MySQL 8+

```bash
# 1. 装依赖
cd /root/workspace/erp-prototype
npm install

# 2. 准备数据库（一次性）
service mariadb start                                # 或 docker run mysql
mariadb -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS fengshengda_erp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'erp_user'@'localhost'
  IDENTIFIED BY 'erp_pass_2026';
GRANT ALL ON fengshengda_erp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
SQL

# 3. 启后端（连 MySQL，自动建表 + 写入 seed）
cd server
PORT=3003 DB_TYPE=mysql DB_HOST=localhost DB_USER=erp_user \
DB_PASS=erp_pass_2026 DB_NAME=fengshengda_erp \
npm run start:dev

# 4. 另开终端：启前端
cd frontend
npm run dev
```

**访问**：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3003/api
- 健康检查：http://localhost:3003/health
- Swagger 文档：http://localhost:3003/api/docs

### 方式 2：pm2 守护（生产级开发）

```bash
cd /root/workspace/erp-prototype

# 一次性安装 pm2 + 启动
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup            # 启用开机自启

# 验证
pm2 list
pm2 logs               # 实时日志
curl http://localhost:3003/health
curl http://localhost:5173/ | head -c 200
```

详见 [PM2.README.md](./PM2.README.md)

### 方式 3：docker-compose 一键起

**前提**：Docker 24+ 已装并跑通

```bash
cd /root/workspace/erp-prototype
docker compose up -d     # mysql + server + frontend 一起起

# 验证
npm run compose:smoke   # 等 3 healthy + curl 7 端点
```

**访问**：
- 前端 http://localhost:8080
- 后端 http://localhost:8080/api
- Swagger http://localhost:8080/api/docs
- MySQL localhost:3306（生产去掉 ports）

**本机 docker 代理故障修复**：
```bash
# 现象：docker build 卡在 docker.io/library/node:20-alpine...
# 原因：/etc/docker/daemon.json 配了 socks5 代理但 10808 已死
sudo bash scripts/fix-docker-proxy.sh
# 脚本会备份 + 清空 proxies + restart dockerd
```

详见 [docker-compose.README.md](./docker-compose.README.md)

---

## 📂 项目结构

```
/root/workspace/erp-prototype/
├── package.json                  # workspace 根（npm workspaces）
├── ecosystem.config.cjs          # pm2 2 进程配置
├── README.md                     # 本文件
├── PM2.README.md                 # pm2 命令/自启/排错
├── docker-compose.yml            # 一键起
├── docker-compose.README.md      # compose 说明
├── .gitignore
├── .dockerignore
├── .github/
│   ├── workflows/ci.yml          # GitHub Actions 4 job
│   ├── dependabot.yml            # 每周自动更新依赖
│   └── ISSUE_TEMPLATE/bug.md
├── server/                       # NestJS 后端
│   ├── Dockerfile                # multi-stage build
│   ├── package.json
│   ├── tsconfig.json             # useDefineForClassFields: false
│   ├── tsconfig.test.json        # jest 专用
│   ├── jest.config.js
│   └── src/
│       ├── main.ts               # bootstrap + ValidationPipe + Swagger
│       ├── app.module.ts         # 13 entity + 14 module
│       ├── entities/             # 13 entity + 2 enum
│       ├── dto/                  # class-validator DTO + 单测
│       ├── modules/              # 14 controller（@ApiTags + @ApiOperation）
│       ├── common/               # LoggingInterceptor
│       ├── e2e/                  # 12 e2e 集成测试
│       └── seed.service.ts       # 65 条 seed 数据
├── frontend/                     # Vite + React
│   ├── Dockerfile                # nginx 1.27
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts            # /api → 3003
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # 20 路由 + 角色 Guard
│       ├── index.css             # 米白/墨绿/铜橙主题
│       ├── api/client.ts         # 14+ 端点 + CRUD helpers
│       ├── store/index.ts        # Zustand auth (persist)
│       ├── components/
│       │   └── EditModal.tsx     # 通用 Form Modal (FieldDef 驱动)
│       ├── layouts/
│       │   └── MainLayout.tsx    # 侧边栏 + Header + 用户菜单
│       └── pages/                # 20 业务页
│           ├── Login.tsx
│           ├── Dashboard.tsx
│           ├── Products.tsx           + ProductDetail.tsx
│           ├── Purchase.tsx
│           ├── Suppliers.tsx
│           ├── Inventory.tsx          + BatchDetail.tsx
│           ├── Movements.tsx
│           ├── Media.tsx
│           ├── Customers.tsx          + CustomerDetail.tsx
│           ├── Sales.tsx
│           ├── Salesman.tsx
│           ├── Commission.tsx
│           ├── FinanceReceive.tsx
│           ├── FinancePay.tsx
│           ├── AccountLedger.tsx
│           ├── PriceSettings.tsx
│           └── UserSettings.tsx
```

---

## 🗄️ 数据库设计

13 张表 + 2 个枚举类型：

| 表 | 角色 | 关键字段 |
|---|---|---|
| **users** | 4 角色 | username / password_hash / role / default_commission_rate / phone |
| **products** | 老板/仓库/业务员 | category / origin / factory_code / spec / grade / qty_per_unit / goods_location |
| **product_prices** | 老板/业务员 | product_id / **tax_rate（1% 或 9%）** / price / effective_from |
| **suppliers** | 老板/采购 | name / contact / phone / address / **settle_type** |
| **purchase_orders** | 老板/财务 | po_no / supplier_id / product_id / qty / cost_price / purchase_date / **settle_status（未结/部分/已结）** / paid_amount |
| **inventory_batches** | 仓库/老板 | batch_no / product_id / purchase_order_id / qty_total / **qty_remaining** / warehouse / holder / status |
| **inventory_movements** | 仓库 | batch_id / type(in/out/transfer/loss/return) / qty / operator / to_holder / ref_order_no |
| **media_assets** | 仓库/业务员 | product_id / batch_id / type(image/video) / file_path / thumb / uploader_id |
| **customers** | 老板/业务员 | name / contact / phone / address / **type（加工厂/批发商/商超/餐饮）** / **nature（国企/个体户）** / sales_user_id |
| **sales_orders** | 老板/业务员/财务 | so_no / customer_id / sales_user_id / product_id / batch_id / qty / sale_price / tax_rate / received_amount / settle_status |
| **commission_records** | 老板/业务员 | sales_order_id / sales_user_id / rate / amount / settle_status（pending/paid） |
| **payment_accounts** | 财务 | name / **type（公账/微信/支付宝/现金/其他）** / is_company / opening_balance / status |
| **payment_transactions** | 财务 | account_id / direction(in/out) / amount / **source_type（manual/purchase/sale/commission）** / ref_order_id / counter_party |

**事务级联示例**（POST /api/purchase）：
```
开事务
  → INSERT purchase_orders (自动生成 PO260605-01)
  → INSERT inventory_batches (批次号 B20260605-007, 100 箱)
  → INSERT inventory_movements (type=in, qty=100, 接手人=仓管)
  → 如果 paid_amount > 0: INSERT payment_transactions (direction=out, source=purchase)
提交事务
```

---

## 👥 角色与权限

| 角色 | 账号 | 密码 | 菜单数 | 业务范围 |
|---|---|---|---|---|
| **老板** | `boss` | `demo` | 16 | 全部 + 价格 + 利润 + 账户 + 报表 + 权限 |
| **财务** | `finance` | `demo` | 14 | 收款 / 付款 / 账户流水 / 佣金结算 |
| **仓库** | `warehouse` | `demo` | 7 | 产品 / 批次 / 库存 / 出入库 / 图片视频 |
| **业务员** | `sales01` | `demo` | 4 | 自己的客户 / 销售 / 佣金 / 业绩 |

菜单/按钮权限由 `MainLayout.tsx` 配合 Zustand 的 `user.role` 控制，**前端隐藏 + 后端再校验**。

---

## 📚 API 文档（Swagger）

启动后端后访问 **http://localhost:3003/api/docs**

按 9 个 tag 分组：
- **认证** — POST /api/auth/login
- **产品** — CRUD + 双税票价 /api/products/:id/prices
- **供应商** — CRUD
- **客户** — CRUD
- **采购** — POST 自动级联（建批次+流水+付款 Tx）+ /api/purchase/:id/pay
- **销售** — POST 自动级联（扣批次+流水+佣金+收款 Tx）+ /api/sales/:id/receive
- **库存** — POST 手动出入库 + /api/inventory/movement
- **佣金** — POST 结算 /api/commission/:id/settle
- **财务** — CRUD 账户 + POST 手工记账 /api/finance/transactions
- **媒体** — POST /api/media/upload（multer 接收 multipart/form-data 到 server/uploads/）
- **仪表盘** — GET /api/dashboard/kpi
- **健康** — GET /health（独立路由，不在 /api 前缀下）

DTO 验证规则：
- ✅ 必填字段缺失 → 400
- ✅ 未知字段 → 400（`forbidNonWhitelisted: true`）
- ✅ 枚举值错误（如 tax_rate 传 5）→ 400
- ✅ 数字越界 → 400

---

## ✅ 测试

```bash
# 后端单测（23 DTO 验证）
npm run test

# 后端 e2e（12 业务流 + 10 媒体上传 = 22 cases，隔离 SQLite 库）
npm run test:e2e

# 一次跑全部 45
npm --workspace server test

# Playwright 浏览器冒烟（20 cases，前提：pm2 启着 vite + nest）
npm --workspace frontend run e2e:playwright

# 覆盖率
npm --workspace server test -- --coverage
```

**测试矩阵**（全部通过）：
- DTO 验证：23 cases（必填/枚举/类型/越界/未知字段拦截）
- E2E 业务流：12 cases（登录/采购级联/销售扣减/佣金/结算）
- E2E 媒体上传：10 cases（multer 写盘/静态访问/超限/过滤/Delete）
- Playwright 浏览器冒烟：20 cases（4 角色/Dashboard/Products/Purchase/权限）

**总测试 77**（45 后端 + 21 浏览器 + 8 新增：销售反冲 3 + JWT 4 + 物理删禁用 1）。

---

## ⚙️ PM2 进程管理

详见 [PM2.README.md](./PM2.README.md)

```bash
pm2 start ecosystem.config.cjs   # 启 2 进程
pm2 list                          # 状态
pm2 logs                          # 实时日志
pm2 restart all                   # 重启
pm2 monit                         # CPU/MEM 监控
pm2 save                          # 持久化进程列表
pm2 startup                       # 开机自启（systemd）
```

特性：
- ✅ **autorestart** 进程挂了自动拉起（验证过 kill -9 vite 2s 内恢复）
- ✅ **max_memory_restart** 512M/768M 触发重启
- ✅ **logrotate** 50MB 自动切 + gzip 压缩 + 保留 14 天
- ✅ **开机自启** 通过 pm2-root.service

---

## 🐳 Docker 部署

详见 [docker-compose.README.md](./docker-compose.README.md)

```bash
docker compose up -d
# 访问 http://localhost:8080
# 包含：mysql:8.0 + server (Node 20 alpine) + frontend (nginx 1.27)
```

- mysql_data volume 持久化
- server_uploads volume 持久化
- healthcheck 链式依赖：mysql healthy → server healthy → frontend healthy
- nginx 反代 /api/* + /uploads/* 到 server container

---

## 🔄 CI/CD

`.github/workflows/ci.yml` 4 job：

| Job | 内容 |
|---|---|
| **backend** | npm install → tsc --noEmit → 单测（23）→ e2e（22）→ 覆盖率（Codecov） |
| **frontend** | npm install → tsc --noEmit → vite build → 上传 dist artifact |
| **docker** | buildx 缓存构建 server + frontend 镜像 |
| **compose-smoke** | docker compose up → 等 3 healthy → curl 7 端点 → 失败拉日志 |
| **playwright** | 起后端 + vite preview → 装 chromium → 跑 20 浏览器冒烟 → 上传 HTML 报告 |

触发：push 到 main / develop，PR 到 main / develop

依赖更新：Dependabot 每周自动 PR（npm + github-actions）

---

## 🔀 数据库切换（MySQL / SQLite）

通过 `DB_TYPE` 环境变量切换，**不需要改代码**：

```bash
# MySQL（生产）
DB_TYPE=mysql DB_HOST=... DB_USER=... npm start

# SQLite（开发 / 离线 / 测试）
DB_TYPE=better-sqlite3 DB_PATH=erp.db npm start
```

TypeORM `synchronize: true` 自动建表。**生产请改 migrations**（TODO）。

---

## 📝 开发约定

### 目录 / 文件
- 业务模型改 `server/src/entities/*.entity.ts`
- DTO 改 `server/src/dto/*.dto.ts`（**加 class-validator 装饰器**）
- 新 controller 在 `server/src/modules/*.module.ts`
- 新页面在 `frontend/src/pages/*.tsx`
- 通用表单复用 `frontend/src/components/EditModal.tsx`（FieldDef 驱动）

### 命名
- 文件名 PascalCase（entity / dto / component）
- 数据库表名 snake_case + s 复数（products / purchase_orders）
- 列名 snake_case（settle_status / qty_remaining）
- 接口响应 camelCase（TypeORM 自动映射）

### 提交
- 提交信息用 [Conventional Commits](https://www.conventionalcommits.org/)：
  - `feat: 新增佣金结算界面`
  - `fix: 修复销售超卖时未扣批次剩余`
  - `chore: 更新依赖`
  - `docs: 补充 README 部署章节`

### 推送
```bash
git add -A
git commit -m "feat: ..."
git push origin main
```

### 一键推送（推荐）
```bash
# 安装
ln -sf /root/workspace/erp-prototype/.gpalias.sh /usr/local/bin/gp

# 使用
gp "feat: 新增佣金结算界面"   # 自动 add + commit + push
gp                            # 用 $EDITOR 写长 message
```

特性：
- ✅ 仅在有改动时推送
- ✅ 提交前打印 status 概览
- ✅ 推送到 main 自动 push
- ✅ 非 main 分支只 commit 不 push
- ✅ 空 message 报错拒绝执行

---

## 🔐 安全 — 全部已修复 ✓

| 严重度 | 问题 | 状态 | 修法 |
|---|---|---|---|
| 🔴 P0 | 后端 14 个 controller 无 JWT/Guard | ✅ | 装 `@nestjs/jwt` + `passport-jwt`；全局 `APP_GUARD=JwtAuthGuard` + 端点 `@Public()` 跳过；login 返 `{access_token, user}` |
| 🔴 P0 | 密码明文 + `/api/auth/users` 公开 | ✅ | 装 `bcrypt`；`User.password_hash: select:false`；seed 用 `bcrypt.hash('demo',10)`；`/api/auth/users` 加 `@Roles('boss')` |
| 🔴 P0 | 前端可改 localStorage 伪造 role | ✅ | 前端 store 写 `localStorage['fsd-token']`；后端 JWT 签名校验 + RolesGuard |
| 🟠 P1 | CORS 全开 + 无 rate-limit | ✅ | `cors.origin = process.env.CORS_ORIGINS` 白名单；装 `@nestjs/throttler` 全局 100 req/min + login 20/min |
| 🟠 P1 | 无 HTTPS | ⚠ | nginx + Let's Encrypt 留给部署 |
| 🟠 P1 | MySQL 密码在 env 明文 | ✅ | docker-compose 改 `secrets` external；`.env.production.example` + 演示用 dev secret |
| 🟠 P1 | `synchronize: true` 生产 | ✅ | `config.factory.ts` 按 `NODE_ENV` 切：dev=true / prod=false；新 `data-source.ts` + `npm run migration:generate/run` |
| 🟠 P1 | `/health` 泄漏 rss | ✅ | 公开 `/health` 仍含，但 `/internal/health` 需 boss JWT |

---

## 🔁 生产部署 Checklist

部署到正式服前**逐项验证**（已自动化的项打 ✓）：

- [x] `NODE_ENV=production`（自动切 JWT secret 校验）
- [x] `DB_TYPE=mysql` + `config.factory.ts` 缺关键变量 process.exit(1)
- [x] `JWT_SECRET`（生产必须 ≥ 32 位随机；可用 `openssl rand -hex 32`）
- [x] bcrypt 密码哈希（已就位）
- [x] CORS 白名单 `CORS_ORIGINS=https://erp.example.com`（已就位）
- [x] 全局限流 100 req/min（已就位；可调）
- [x] TypeORM `synchronize=false` + `data-source.ts` migration（已就位）
- [x] `synchronize: false` + TypeORM migration 文件就位
- [x] docker-compose 用 secrets（已就位）
- [x] `/internal/health` 限 boss 鉴权（已就位）
- [ ] nginx + Let's Encrypt HTTPS（部署时配）
- [ ] Sentry DSN（已留接口，配 SENTRY_DSN 启用）
- [ ] pm2 `pm2 save && pm2 startup`（已就位）
- [ ] MariaDB 每日 3:00 自动备份（部署时加 cron）
- [ ] 关掉 `/internal/*` 端点的外网访问（nginx 层做）
- [x] 日志脱敏：password/token/cookie 已 redact（pino + interceptor 不打 body）
- [x] Playwright + Jest 全测在 CI 绿（5 jobs）
- [ ] rate-limit 在 nginx 层（限制 100 req/s）

详见 `docs/deploy.md`（TODO）

---

## 🔁 数据域切换

只在 `server/src/seed.service.ts` 改种子数据，**保持外键 ID 稳定**（user.id=1 是 boss，永远是老板），前端代码无需改。

如果要切到完全不同的业务（不再做鸡爪）：
1. 改 entity 字段（如把 product 加 `sku` 字段）
2. 改 seed 数据
3. 改前端文案（搜索 "丰晟达" / "鸡爪" 全替换）

---

## 🛠 故障排查

### Q1: 启动后端连不上 MySQL
```
[ExceptionHandler] Access denied for user ''@'localhost'
```
**解决**：设全 env 变量
```bash
DB_HOST=localhost DB_PORT=3306 DB_USER=erp_user DB_PASS=erp_pass_2026 DB_NAME=fengshengda_erp
```

### Q2: 前端白屏
```bash
# 1. 看 vite 进程在不在
pm2 list
# 2. 看日志
pm2 logs fengshengda-frontend --lines 50
# 3. 重启
pm2 restart fengshengda-frontend
```

### Q3: DTO 验证返回 400 但字段看起来没问题
检查字段名是否被 whitelist 过滤。**`forbidNonWhitelisted: true`** 会拒收任何 DTO 上没声明的字段。

### Q4: Docker build 失败，socks 代理报错
编辑 `/etc/docker/daemon.json` 删除 `proxies` 段：
```json
{}
```
然后 `systemctl restart docker`

### Q5: pm2 启动失败
```bash
pm2 kill                      # 杀干净
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 🤝 贡献指南

1. Fork / Clone
2. 创建 feature branch（`git checkout -b feat/xxx`）
3. 提交代码（带测试）
4. 用 `gp "feat: 提交信息"` 一键推送
5. 开 PR
6. 等 Code Review + CI 绿
7. 合并

详见 [Issue Template](.github/ISSUE_TEMPLATE/bug.md)

---

## 📄 License

UNLICENSED · 内部项目
