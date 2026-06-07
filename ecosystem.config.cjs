// pm2 进程守护配置 — 管 vite dev + nest dev + mysql 健康监控
// 用法：pm2 start ecosystem.config.cjs
//      pm2 save           # 保存进程列表（pm2 startup 后自动恢复）
//      pm2 startup        # 注册 systemd 启动脚本（开机自启）

module.exports = {
  apps: [
    {
      name: 'fengshengda-frontend',
      cwd: '/root/workspace/erp-prototype/frontend',
      script: '/root/workspace/erp-prototype/node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 5173',
      autorestart: true,
      restart_delay: 3000,           // 重启前等 3s
      max_restarts: 20,              // 最多重启 20 次
      min_uptime: '30s',             // 至少运行 30s 才算稳定
      max_memory_restart: '512M',    // 超过 512M 自动重启
      kill_timeout: 5000,
      out_file: '/root/.pm2/logs/fengshengda-frontend.out.log',
      error_file: '/root/.pm2/logs/fengshengda-frontend.error.log',
      time: true,                    // 时间戳前缀
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'fengshengda-server',
      cwd: '/root/workspace/erp-prototype/server',
      script: '/root/workspace/erp-prototype/node_modules/.bin/ts-node-dev',
      args: '--respawn --transpile-only src/main.ts',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      min_uptime: '30s',
      max_memory_restart: '768M',
      kill_timeout: 5000,
      out_file: '/root/.pm2/logs/fengshengda-server.out.log',
      error_file: '/root/.pm2/logs/fengshengda-server.error.log',
      time: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
        DB_TYPE: 'mysql',
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_USER: 'erp_user',
        DB_PASS: 'erp_pass_2026',
        DB_NAME: 'fengshengda_erp',
      },
    },
  ],
};
