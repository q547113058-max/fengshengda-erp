# 丰晟达 ERP（鸡爪供应链）完整部署文档

> 适用版本：v0.6+ | 最后更新：2026-06-23
> GitHub：https://github.com/q547113058-max/fengshengda-erp.git

---

## 一、环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| **操作系统** | Ubuntu 20.04+ / Debian 11+ | 本文档以 Ubuntu 为例 |
| **Node.js** | v22.x | 推荐 v22.22.2（`nvm install 22`） |
| **npm** | v10.x | 随 Node 22 自带 |
| **MySQL** | 8.0+ / MariaDB 10.11+ | 生产必选；演示可用 SQLite |
| **nginx** | 1.18+ | 前端静态 + API 反代 + HTTPS 终止 |
| **pm2** | latest | 进程守护 + 开机自启 |
| **certbot** | latest | Let's Encrypt 免费 SSL 证书 |

---

## 二、服务器初始化

```bash
# 1. 系统更新
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js 22（通过 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version   # 应输出 v22.x.x

# 3. 安装 pm2（全局）
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true

# 4. 安装 nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# 5. 安装 MySQL（如用 MySQL）
sudo apt install -y mysql-server
sudo systemctl enable mysql

# 6. 安装 certbot（如用 HTTPS）
sudo apt install -y certbot python3-certbot-nginx
```

---

## 三、数据库准备（MySQL）

```sql
-- 登录 MySQL
sudo mysql

-- 创建数据库和用户
CREATE DATABASE fengshengda_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'your_32char_random_password';
GRANT ALL PRIVILEGES ON fengshengda_erp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> **安全提醒**：密码用 `openssl rand -hex 16` 生成 32 位随机串，别用示例密码。

---

## 四、部署代码

### 4.1 克隆仓库

```bash
# 目标目录（可自定义）
sudo mkdir -p /data/erp-system
sudo chown $USER:$USER /data/erp-system
cd /data

git clone https://github.com/q547113058-max/fengshengda-erp.git erp-system
cd erp-system
```

### 4.2 安装依赖

```bash
# 根目录依赖（NestJS 后端 + Vite 前端 + 共享工具）
npm install

# TypeScript 编译检查（可选但推荐）
cd server && npx tsc --noEmit && cd ..
cd frontend && npx tsc --noEmit && cd ..
```

### 4.3 配置环境变量

```bash
# 从模板创建 .env 文件
cp .env.production.example server/.env

# 编辑 server/.env，修改以下必填项：
vim server/.env
```

**必须修改的配置**：

```ini
# ====== 数据库 ======
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=erp_user
DB_PASS=your_32char_random_password   # ← 改成上面创建的密码
DB_NAME=fengshengda_erp

# ====== JWT 密钥 ======
JWT_SECRET=your_32char_random_secret  # ← openssl rand -hex 16 生成
JWT_EXPIRES_IN=24h                    # token 有效期

# ====== CORS 白名单 ======
CORS_ORIGINS=https://erp.your-domain.com,http://localhost:5173
# ↑ 改成你的正式域名

# ====== 其他 ======
NODE_ENV=production
PORT=3003
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=20
THROTTLE_LIMIT=60
LOG_LEVEL=info
```

### 4.4 构建前端

```bash
cd frontend
rm -rf node_modules/.vite dist   # 清缓存
npm run build                     # tsc 检查 + vite build
# 产物：dist/index.html + dist/assets/*.js + dist/assets/*.css
```

---

## 五、Nginx 配置

### 5.1 复制配置模板

```bash
# 修改模板中的域名和路径
sudo cp nginx/erp.example.com.conf /etc/nginx/sites-available/fengshengda-erp

# 编辑，替换域名和路径
sudo vim /etc/nginx/sites-available/fengshengda-erp
```

**需要全局替换的内容**：
| 模板占位 | 替换为 |
|----------|--------|
| `erp.example.com` | 你的正式域名 |
| `/data/erp-system/frontend/dist` | 实际前端构建产物路径 |

### 5.2 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/fengshengda-erp /etc/nginx/sites-enabled/
sudo nginx -t                    # 测试配置
sudo systemctl reload nginx      # 重载
```

### 5.3 HTTPS 证书（可选但强烈建议）

```bash
# Let's Encrypt 自动配置
sudo certbot --nginx -d erp.your-domain.com

# 证书自动续期（certbot 默认已加 cron）
sudo certbot renew --dry-run
```

---

## 六、PM2 进程守护

### 6.1 启动服务

```bash
cd /data/erp-system

# 检查 ecosystem.config.cjs 中的路径指向正确
cat ecosystem.config.cjs

# 启动所有服务
pm2 start ecosystem.config.cjs --env production

# 检查状态
pm2 list
# 应看到：
#   fengshengda-server   online  端口 3003
#   fengshengda-frontend online  端口 5173（生产可不跑，仅 nginx 直出静态文件即可）
```

### 6.2 生产推荐：只跑后端 + nginx 前端

```bash
# 编辑 ecosystem.config.cjs，注释掉或删除 fengshengda-frontend 段
# 或单独启动：
pm2 start ecosystem.config.cjs --only fengshengda-server --env production
pm2 save
```

> **说明**：生产环境前端是纯静态文件，nginx 直出性能远好于 Vite dev server。只在开发/测试环境才跑 `fengshengda-frontend`。

### 6.3 开机自启

```bash
pm2 save            # 保存当前进程列表
pm2 startup         # 注册 systemd 服务
# 执行 pm2 startup 输出的命令（如 sudo env PATH=...）
sudo systemctl enable pm2-$USER
```

**验证开机自启**：
```bash
# 重启后检查
sudo reboot
# 等 30 秒后重新 SSH
pm2 list            # 应显示 online
systemctl status pm2-$USER
```

---

## 七、初始化数据

```bash
cd /data/erp-system/server

# 首次部署会通过 TypeORM synchronize 自动建表
# 第一次启动后端时，seed 服务会自动插入演示数据（检测到表为空）

# 手动重置数据（如果需要）
npm run seed:reset
```

**默认账号**：

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| boss | demo | 老板 | 全部 |
| finance | demo | 财务 | 14 模块 |
| warehouse | demo | 仓储 | 7 模块 |
| sales01 | demo | 销售 | 4 模块 |

---

## 八、验证部署

```bash
# 1. 后端健康检查
curl http://localhost:3003/health
# 应返回：{"status":"ok","db":{"type":"mysql","status":"connected"},"uptime":...}

# 2. API 响应检查
curl http://localhost:3003/api/products | head -c 200

# 3. 登录测试
curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boss","password":"demo"}'
# 应返回 JWT token

# 4. 前端页面
curl -s https://erp.your-domain.com/ | head -c 200
# 应返回 <!doctype html>...丰晟达 ERP...

# 5. PM2 状态
pm2 list
pm2 logs fengshengda-server --lines 20
```

---

## 九、防火墙配置

```bash
# 开放 HTTPS + HTTP
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 可选：SSH 限制
sudo ufw allow 22/tcp

# 后端端口 3003 不要对外开放！只允许本机 nginx 访问
# 如有 ufw：sudo ufw deny 3003/tcp

sudo ufw enable
sudo ufw status
```

---

## 十、备份策略

```bash
# 1. MySQL 每日备份（crontab）
sudo mkdir -p /backup/erp
sudo chown $USER:$USER /backup/erp

crontab -e
# 添加：
# 0 3 * * * mysqldump -u erp_user -p'password' fengshengda_erp | gzip > /backup/erp/db-$(date +\%Y\%m\%d).sql.gz
# 0 4 * * * find /backup/erp/ -name 'db-*.sql.gz' -mtime +30 -delete
```

> 如果用 SQLite，备份更简单：`cp /data/erp-system/server/erp.db /backup/erp/`

---

## 十一、日常运维

### 11.1 更新代码

```bash
cd /data/erp-system
git pull origin main

# 如有新依赖
npm install

# 重新构建前端
cd frontend && rm -rf node_modules/.vite dist && npm run build && cd ..

# 重启后端
pm2 restart fengshengda-server

# 验证
pm2 logs fengshengda-server --lines 5
curl http://localhost:3003/health
```

### 11.2 查看日志

```bash
# pm2 实时日志
pm2 logs fengshengda-server

# nginx 日志
tail -f /var/log/nginx/erp.access.log
tail -f /var/log/nginx/erp.error.log
```

### 11.3 数据库迁移

```bash
# 生产环境 synchronize=false，schema 变更需手写 migration
cd server

# 生成 migration（基于 entity 和数据库差异）
npm run migration:generate -- src/migrations/AddNewColumn

# 执行 migration
npm run migration:run

# 回滚
npm run migration:revert
```

### 11.4 故障排查

| 现象 | 诊断命令 | 常见原因 |
|------|----------|----------|
| 502 Bad Gateway | `pm2 list` | 后端挂了，`pm2 restart fengshengda-server` |
| 页面空白 | `ls frontend/dist/index.html` | 前端没构建，或 nginx root 路径错了 |
| 登录 401 | `cat server/.env \| grep JWT_SECRET` | JWT 密钥变了，需重新登录 |
| API 500 | `pm2 logs fengshengda-server --lines 50` | 数据库连不上 / SQL 错误 |
| CORS 报错 | `cat server/.env \| grep CORS_ORIGINS` | nginx 域名不在白名单 |
| 端口冲突 | `ss -tlnp \| grep 3003` | 旧进程没杀干净 |

---

## 十二、架构总览

```
用户浏览器 (HTTPS)
    │
    ▼
nginx (:443, :80)
    │
    ├─ /           → /data/erp-system/frontend/dist/  (SPA 静态文件)
    ├─ /api/*      → http://127.0.0.1:3003             (NestJS 后端)
    ├─ /uploads/*  → /data/erp-system/server/uploads/  (文件直出)
    └─ /health     → http://127.0.0.1:3003/health      (健康检查)
    
NestJS 后端 (:3003)
    ├─ TypeORM + MySQL 8.0 (生产) / SQLite (开发)
    ├─ JWT 鉴权 (24h 过期)
    ├─ 14 业务模块 (产品/采购/销售/库存/财务/佣金/客户/供应商/用户/媒体/仪表盘)
    ├─ Swagger 文档 (/api/docs, 仅内网)
    └─ 限流 60 req/min (可配)

前端 (Vite 5 + React 18 + AntD 5)
    ├─ 11 页面 (概览/产品/采购/供应商/库存/出入库/图片/销售/客户/业绩/佣金/收款/付款/流水/用户)
    ├─ 4 角色 (老板/财务/仓储/销售)
    └─ 可编辑权限矩阵
```

---

## 十三、端口分配

| 端口 | 服务 | 对外 | 说明 |
|------|------|------|------|
| 80 | nginx HTTP | ✅ | 自动跳转 443 |
| 443 | nginx HTTPS | ✅ | SSL 终止 |
| 3003 | NestJS 后端 | ❌ | 仅本机 nginx 反代 |
| 3306 | MySQL | ❌ | 仅本机 |
| 5173 | Vite dev | ❌ | 仅开发用 |

> ⚠️ **后端端口 3003 不要对外开放**，所有请求都经 nginx。

---

## 十四、快速部署脚本

```bash
#!/bin/bash
# 一键部署脚本 — 放在 /data/erp-system/deploy.sh
set -e

echo "=== 丰晟达 ERP 部署 ==="
cd /data/erp-system

# 1. 拉代码
echo "[1/5] 拉取最新代码..."
git pull origin main

# 2. 装依赖（如有新增）
echo "[2/5] 检查依赖..."
npm install --prefer-offline 2>&1 | tail -5

# 3. 构建前端
echo "[3/5] 构建前端..."
cd frontend
rm -rf node_modules/.vite dist
npm run build 2>&1 | tail -5
cd ..

# 4. 重启后端
echo "[4/5] 重启后端..."
pm2 restart fengshengda-server

# 5. 验证
echo "[5/5] 验证..."
sleep 3
curl -s http://localhost:3003/health | head -c 100

echo ""
echo "✅ 部署完成"
echo "   前端: https://your-domain.com"
echo "   健康: http://localhost:3003/health"
```
