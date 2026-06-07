# PM2 进程管理

> 用 pm2 同时管 vite dev + nest dev，自动重启 + 开机自启 + 日志轮转。

## 当前进程
```
┌────┬─────────────────────────┬──────────┬──────────┐
│ id │ name                    │ port     │ mode     │
├────┼─────────────────────────┼──────────┼──────────┤
│ 0  │ fengshengda-frontend    │ 5173     │ vite dev │
│ 1  │ fengshengda-server      │ 3003     │ nest dev │
│ 2  │ pm2-logrotate           │ -        │ 日志轮转 │
└────┴─────────────────────────┴──────────┴──────────┘
```

## 常用命令
```bash
pm2 list                    # 进程列表
pm2 logs                    # 实时日志（所有进程）
pm2 logs fengshengda-server # 只看 server
pm2 restart all             # 重启
pm2 restart fengshengda-frontend
pm2 stop all                # 停
pm2 delete all              # 删（需要重新 start）

# 重载代码
cd /root/workspace/erp-prototype && pm2 reload ecosystem.config.cjs
```

## 开机自启
```bash
# 已设置（systemd 方式）
systemctl status pm2-root   # 看状态
systemctl list-units | grep pm2

# 进程列表在 /root/.pm2/dump.pm2
# 重启机器后 pm2 会自动恢复

# 取消自启
pm2 unstartup systemd
```

## 日志
- 位置：`/root/.pm2/logs/`
- 轮转：50MB 自动切 + gzip 压缩
- 保留：14 天
- 调度：每天 0:0 强制切

## 配置文件
`/root/workspace/erp-prototype/ecosystem.config.cjs`

## 修改 env / 加新进程
1. 编辑 ecosystem.config.cjs
2. `pm2 reload ecosystem.config.cjs`（不中断）
3. `pm2 save` 持久化

## 监控
```bash
pm2 monit                   # CPU/MEM 实时监控
pm2 plus                    # （可选）pm2 官方云监控
```

## 故障排查
```bash
# 进程挂了
pm2 logs <name> --lines 100 --nostream

# 端口被占
lsof -i :5173
lsof -i :3003

# 完全重启
pm2 kill                    # 杀 pm2 daemon + 全部子进程
pm2 start /root/workspace/erp-prototype/ecosystem.config.cjs
pm2 save
```

## 与 docker-compose 的关系
- **本机开发**：用 pm2（热重载、日志集中）
- **生产/CI**：用 docker-compose（隔离环境、一致部署）

两套不冲突，pm2 管本机，docker-compose 管容器。
