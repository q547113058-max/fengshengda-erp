# 部署文档 — 丰晟达 ERP 生产环境

> 从一台全新的 Linux 服务器，到 https://erp.example.com 上线运行的完整步骤。
> 预计总耗时：2-3 小时（含证书申请等待时间）。

---

## 目录

- [0. 前置条件](#0-前置条件)
- [1. 服务器初始化](#1-服务器初始化)
- [2. 部署代码](#2-部署代码)
- [3. 配置环境变量 + Docker secrets](#3-配置环境变量--docker-secrets)
- [4. 启动数据库 + 后端 + 前端](#4-启动数据库--后端--前端)
- [5. nginx 反代 + Let's Encrypt HTTPS](#5-nginx-反代--lets-encrypt-https)
- [6. pm2 守护 + 开机自启](#6-pm2-守护--开机自启)
- [7. 每日自动备份](#7-每日自动备份)
- [8. 监控 + 错误上报](#8-监控--错误上报)
- [9. 更新流程](#9-更新流程)
- [10. 故障排查 + 回滚](#10-故障排查--回滚)
- [11. 性能调优 checklist](#11-性能调优-checklist)

---

## 0. 前置条件

### 服务器要求
- **OS**: Ubuntu 22.04 LTS / Debian 12（推荐）或 CentOS 9 Stream
- **CPU**: 2 vCPU 起（中型公司 4-8 vCPU 够用）
- **RAM**: 4 GB 起（生产建议 8 GB，pm2 + MySQL + nginx 都不重）
- **磁盘**: 40 GB 起（系统 + 镜像 + 备份）
- **网络**: 公网 IP + 开放 80/443/22（80/443 给 certbot + 用户访问；22 给 SSH）

### 域名
- **DNS A 记录**：`erp.example.com → <公网 IP>`（先在域名服务商加好，certbot 验证要用）
- 备用子域（可选）：`api.example.com` / `admin.example.com`

### 域名服务商 API Key（备 certbot 泛域名）
- **Cloudflare / Aliyun DNS / DNSPod** 任一（certbot 需要 DNS 验证才能签发通配符证书）

### 本地工具
- SSH 客户端（密码 / SSH key）
- `sshpass`（如果用密码登录）：`apt install sshpass`

---

## 1. 服务器初始化

### 1.1 创建部署用户

```bash
# root 登录后
adduser deploy
usermod -aG sudo deploy
# 配 SSH key（推荐）
mkdir -p /home/deploy/.ssh
# 把你的公钥粘贴到 authorized_keys
nano /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 1.2 系统包

```bash
sudo apt update
sudo apt install -y \
  curl wget git vim htop \
  ufw fail2ban \
  mysql-client \
  nginx certbot python3-certbot-nginx \
  build-essential
```

### 1.3 防火墙

```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP (certbot + 跳转)
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable
sudo ufw status
```

### 1.4 Docker（生产推荐）

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
newgrp docker
docker --version

# 配 docker daemon（如果在中国大陆 + 走代理）
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

### 1.5 Node.js 20 LTS（如果用 pm2 而非 docker）

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v20.x.x
```

---

## 2. 部署代码

### 方式 A：Git 克隆（推荐）

```bash
sudo mkdir -p /data
sudo chown deploy:deploy /data
cd /data
git clone https://github.com/q547113058-max/fengshengda-erp.git erp-system
cd erp-system
```

### 方式 B：CI 自动部署（GitHub Actions）

在生产机 SSH key 加到 GitHub Deploy Keys（只读），配置 `.github/workflows/deploy.yml`：
```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: deploy
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /data/erp-system
            git pull
            docker compose --env-file .env.production up -d --build
            docker compose exec -T server npm run migration:run
```

---

## 3. 配置环境变量 + Docker secrets

### 3.1 生成密钥

```bash
# JWT secret（32 字节随机）
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET: $JWT_SECRET"

# 数据库密码（20 字节）
DB_ROOT_PASS=$(openssl rand -hex 16)
DB_USER_PASS=$(openssl rand -hex 16)
echo "DB_ROOT: $DB_ROOT_PASS"
echo "DB_USER: $DB_USER_PASS"
```

### 3.2 写 .env.production

```bash
cd /data/erp-system
cp .env.production.example .env.production
nano .env.production
```

填入：

```bash
# === 数据库 ===
DB_TYPE=mysql
DB_HOST=db
DB_PORT=3306
DB_USER=erp_user
DB_PASS=<填入 $DB_USER_PASS>
DB_NAME=fengshengda_erp

# === JWT ===
JWT_SECRET=<填入 $JWT_SECRET>
JWT_EXPIRES_IN=24h

# === CORS ===
CORS_ORIGINS=https://erp.example.com,https://www.erp.example.com

# === 上传 ===
UPLOAD_DIR=/data/erp-system/uploads
UPLOAD_MAX_MB=20

# === Sentry（可选） ===
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1

# === Nginx 反代上游 ===
BACKEND_URL=http://server:3003
FRONTEND_DIST=/data/erp-system/frontend/dist
```

权限：
```bash
chmod 600 .env.production
```

### 3.3 装 docker secrets

```bash
echo "$JWT_SECRET" | docker secret create fsd_jwt_secret -
echo "$DB_USER_PASS" | docker secret create fsd_db_user_password -
echo "$DB_ROOT_PASS" | docker secret create fsd_db_root_password -
docker secret ls
```

---

## 4. 启动数据库 + 后端 + 前端

### 方式 A：Docker Compose（推荐）

```bash
cd /data/erp-system

# 启动
docker compose --env-file .env.production up -d

# 看日志
docker compose logs -f

# 等所有 3 容器 healthy
docker compose ps
```

输出应类似：
```
NAME                  STATUS          PORTS
fsd-mysql             Up (healthy)    3306/tcp
fsd-server            Up (healthy)    3003/tcp
fsd-frontend          Up (healthy)    80/tcp
```

### 验证

```bash
# 容器内 MySQL
docker compose exec db mysql -u erp_user -p$DB_USER_PASS fengshengda_erp -e "SHOW TABLES"

# 跑 migrations
docker compose exec server npm run migration:run

# 健康检查
curl http://localhost:3003/health
# → {"status":"ok","db":{"type":"mysql","status":"up",...}}

# Swagger
curl http://localhost:3003/api/docs-json | head -c 200
```

### 方式 B：pm2 + 本地 MySQL（备选）

```bash
# 装 MariaDB
sudo apt install -y mariadb-server
sudo mysql_secure_installation

# 创建库 + 用户
sudo mysql -e "
CREATE DATABASE fengshengda_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY '$DB_USER_PASS';
GRANT ALL ON fengshengda_erp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
"

# 装项目依赖
cd /data/erp-system
npm install

# 装 pm2 + logrotate
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14

# 启动
cd /data/erp-system/server
npm run build
pm2 start ecosystem.config.cjs --env production
# 或：pm2 start dist/main.js --name fsd-server
pm2 save
pm2 startup
```

---

## 5. nginx 反代 + Let's Encrypt HTTPS

### 5.1 申请证书

```bash
# 临时开放 80（certbot 验证用）
sudo certbot certonly --nginx -d erp.example.com -d www.erp.example.com
# 或通配符（需要 DNS plugin）：
# sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.secrets/cloudflare.ini -d "*.example.com" -d example.com
```

证书会放在 `/etc/letsencrypt/live/erp.example.com/`：
- `fullchain.pem`
- `privkey.pem`

### 5.2 部署 nginx 站点

```bash
sudo cp /data/erp-system/nginx/erp.example.com.conf /etc/nginx/sites-available/erp
sudo ln -s /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/

# 验证配置
sudo nginx -t
# 重载
sudo systemctl reload nginx
```

### 5.3 验证 HTTPS

```bash
# HTTP → HTTPS 跳转
curl -I http://erp.example.com
# → 301 https://erp.example.com

# HTTPS + 证书
curl -I https://erp.example.com
# → 200 + Strict-Transport-Security 头

# SSL Labs 评分（外部）
# https://www.ssllabs.com/ssltest/analyze.html?d=erp.example.com
# 目标：A 或 A+
```

### 5.4 自动续期

certbot 自带 systemd timer 续期：

```bash
# 验证 timer 启用
sudo systemctl status certbot.timer

# 手动续期测试
sudo certbot renew --dry-run

# 续期后 nginx 自动 reload
echo 'renew_hook = systemctl reload nginx' | sudo tee -a /etc/letsencrypt/renewal-erp.example.com.conf
```

---

## 6. pm2 守护 + 开机自启

（如果用 Docker 方式不需要；用 pm2 需要）

```bash
# 启动
pm2 start ecosystem.config.cjs --env production
pm2 save

# 开机自启（PM2 守护进程 + systemd service）
pm2 startup
# 会输出类似：sudo env PATH=... pm2 startup systemd -u deploy --hp /home/deploy
# 复制粘贴运行

# 验证
sudo systemctl status pm2-deploy
```

---

## 7. 每日自动备份

### 7.1 装脚本

```bash
sudo cp /data/erp-system/scripts/cron-backup.sh /etc/cron.daily/erp-backup
sudo chmod +x /etc/cron.daily/erp-backup
```

### 7.2 配 DB 凭据（避免明文在脚本）

```bash
sudo tee /etc/default/erp-backup <<EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=erp_user
DB_PASS=$DB_USER_PASS
DB_NAME=fengshengda_erp
BACKUP_DIR=/data/backups/erp
RETAIN_DAYS=14
EOF
sudo chmod 600 /etc/default/erp-backup
```

### 7.3 改脚本读 env file

（已包含在 `scripts/cron-backup.sh` 内 — 优先读 `/etc/default/erp-backup`）

### 7.4 测试 + 验证

```bash
# 手动跑
sudo /etc/cron.daily/erp-backup

# 看输出
ls -lah /data/backups/erp/
tail -20 /var/log/erp-backup.log

# 模拟"过期 14 天"
sudo touch -t 202401010000 /data/backups/erp/erp_fengshengda_erp_2024-01-01_03-00.sql.gz
sudo /etc/cron.daily/erp-backup
# 应自动删
ls /data/backups/erp/
```

### 7.5 异地备份（推荐）

```bash
# 加 crontab 每周日 4:00 推 S3
sudo tee /etc/cron.weekly/erp-backup-s3 <<'EOF'
#!/usr/bin/env bash
set -e
LATEST=$(ls -t /data/backups/erp/*.sql.gz | head -1)
aws s3 cp "$LATEST" s3://your-bucket/erp-backups/
EOF
sudo chmod +x /etc/cron.weekly/erp-backup-s3
```

---

## 8. 监控 + 错误上报

### 8.1 Sentry（错误上报）

1. 注册 [sentry.io](https://sentry.io) → 创建 Node.js project → 拿 DSN
2. `.env.production` 加 `SENTRY_DSN=https://xxx@sentry.io/123`
3. 重启 server（SDK 启动时 init）

### 8.2 简单监控（uptime）

```bash
# 装 Uptime Kuma（5 分钟）
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data louislam/uptime-kuma:1
# 访问 http://your-server:3001
# 加 monitor: HTTP(s) → https://erp.example.com/health
```

### 8.3 日志聚合（X7 高级）

看 `docs/loki.md`（待写）：起 Loki + Promtail + Grafana 容器。

---

## 9. 更新流程

### 9.1 滚动更新（推荐）

```bash
cd /data/erp-system
git pull
docker compose --env-file .env.production up -d --build
# 跑新增 migration
docker compose exec server npm run migration:run
# 验证健康
curl https://erp.example.com/health
```

### 9.2 回滚

```bash
# 1. 找上一个稳定 commit
git log --oneline -20

# 2. 切回
git checkout <commit-hash>

# 3. 重新部署
docker compose --env-file .env.production up -d --build

# 4. 跑对应 migration（如果新增了 entity 字段）
docker compose exec server npm run migration:run

# 5. 验证
curl https://erp.example.com/health
```

### 9.3 数据库回滚（谨慎）

```bash
# 1. 停 server
docker compose stop server

# 2. 备份当前数据（防回滚失败）
docker compose exec db mysqldump -u erp_user -p$DB_USER_PASS fengshengda_erp > pre-rollback.sql

# 3. revert migration
docker compose exec server npm run migration:revert

# 4. 启 server
docker compose start server
```

---

## 10. 故障排查 + 回滚

### 10.1 容器起不来

```bash
# 看日志
docker compose logs server

# 常见原因：
# - JWT_SECRET 太短（< 32 位）
# - DB 连不上（检查 db 是否 healthy）
# - 端口被占（3003 / 80）
```

### 10.2 HTTPS 证书过期

```bash
# 手动续期
sudo certbot renew
sudo systemctl reload nginx

# 验证
echo | openssl s_client -connect erp.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 10.3 数据库损坏

```bash
# 1. 停 server
docker compose stop server

# 2. 修复
docker compose exec db mysqlcheck -u root -p$DB_ROOT_PASS --auto-repair fengshengda_erp

# 3. 启
docker compose start server
```

### 10.4 磁盘满

```bash
# 看哪个大
du -sh /data/* | sort -hr | head -5
du -sh /var/log/* | sort -hr | head -5

# 清理
sudo journalctl --vacuum-time=7d
sudo find /data/backups/erp -mtime +14 -delete  # 14 天前备份
docker system prune -a  # 清理未用镜像
```

### 10.5 健康检查全部 503

```bash
# 1. 容器状态
docker compose ps

# 2. db
docker compose exec db mysqladmin -u root -p$DB_ROOT_PASS ping

# 3. server
docker compose logs --tail=100 server

# 4. 直接调内部端点
docker compose exec server curl http://localhost:3003/health
```

### 10.6 pm2 守护失败

```bash
# 看 pm2 状态
pm2 list
pm2 logs fengshengda-server --lines 100

# 重启
pm2 restart fengshengda-server

# 清理 + 重启
pm2 kill
pm2 resurrect  # 从 dump 恢复
```

---

## 11. 性能调优 checklist

部署完成后逐步优化：

| 项 | 命令 | 效果 |
|---|---|---|
| MySQL 连接池 | `app.module.ts` `extra: { connectionLimit: 50 }` | 高并发 DB 不卡 |
| nginx gzip | 已在 conf 开启 | 静态资源 -70% 体积 |
| nginx long-term cache | 已在 conf 开启 | 二次访问秒开 |
| nginx HTTP/2 | listen 443 ssl http2 | 多路复用 |
| pm2 cluster mode | `pm2 start ecosystem.config.cjs -i max` | 多核利用 |
| Redis 缓存 | 装 + 配 products / dashboard cache | DB 压力 -50% |
| CDN | Cloudflare / 阿里云 | 静态资源边缘加速 |
| 限流 nginx 层 | 已在 conf 开启 100 req/s | 防 DoS |
| MariaDB 索引 | 已在 5 个高频字段加 | 查询加速 10x |
| TypeORM lazy load | entity relations `lazy: true` | 首屏 -30% |

---

## 12. 验收清单

部署完成跑这一遍：

- [ ] `curl https://erp.example.com/health` → 200 + db.status=up
- [ ] 浏览器访问 → 自动 301 → 200 + HTTPS 锁
- [ ] SSL Labs 评分 ≥ A
- [ ] 登录页加载 + 4 角色都可登录
- [ ] 提交一笔采购 + 销售 + 付款 + 收款，4 步全过
- [ ] `crontab -l` 显示 `/etc/cron.daily/erp-backup`
- [ ] 手动跑 cron → `/data/backups/erp/` 有 sql.gz
- [ ] 14 天前备份被自动删
- [ ] `pm2 save && pm2 kill && pm2 resurrect` 后服务自动起
- [ ] 模拟 server 挂掉 → `pm2 restart` 自动恢复
- [ ] 看 Sentry dashboard 有无错误

---

## 13. 联系方式

部署过程中卡住：
- 看 GitHub Issues: https://github.com/q547113058-max/fengshengda-erp/issues
- 看 server 日志：`docker compose logs -f server` 或 `pm2 logs fengshengda-server`
- 看前端日志：`docker compose logs -f frontend` 或浏览器 DevTools
- 看 nginx 日志：`sudo tail -f /var/log/nginx/erp.access.log /var/log/nginx/erp.error.log`

---

**部署时间估算**：
- 新手 + 第一次：4-6 小时
- 熟悉 + 有备案域名：2-3 小时
- 老司机 + 域名已解析：1-2 小时
