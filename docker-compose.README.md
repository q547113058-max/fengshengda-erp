# 丰晟达 ERP · 鸡爪供应链 — Docker Compose

> MySQL 8 + NestJS 后端 + 前端（Nginx 反代 + SPA fallback）
> 一键起：docker compose up -d
> 访问：前端 http://localhost:8080，后端 API http://localhost:8080/api
> Swagger：http://localhost:8080/api/docs

## 端口
- **8080** → 前端 + 反代后端（推荐）
- **3003** → 直连后端（调试）
- **3306** → MySQL（可选，开发调试用；生产可去掉 ports）

## 演示账号（统一 `demo`）
- `boss` 老板 · 全部菜单
- `finance` 财务
- `warehouse` 仓储
- `sales01` 销售

## 验证
```bash
docker compose ps                 # 查看健康状态
curl http://localhost:8080/health
curl http://localhost:8080/api/products | head -c 200
```

## 数据持久化
- `mysql_data` volume → 数据库
- `server_uploads` volume → 上传文件
- 删除重建：`docker compose down -v`

## 常见问题
1. **MySQL 起不来** → 看 `docker compose logs mysql`，检查 `innodb_log_file_size` 兼容性（MySQL 8.0 默认 1GB）
2. **后端连不上 MySQL** → 等 `mysql` healthy 之后 server 才起（depends_on 配了 healthcheck）
3. **前端 502** → 后端未启动，等 server 容器 healthy
4. **Socks 代理导致 build 失败** → 编辑 `/etc/docker/daemon.json` 删 `proxies` 段，systemctl restart docker

## 生产部署
- 去掉 `mysql.ports: 3306:3306`（不外露）
- server 加 replicas + nginx 负载均衡
- 把 `server_uploads` 换成 S3 / OSS
- 换 `synchronize: false` + TypeORM migrations
