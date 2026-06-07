// pm2 进程守护配置 — 演示用 .env.dev；生产用 .env.production
// 用法：pm2 start ecosystem.config.cjs --env production
//      pm2 save           # 保存进程列表（pm2 startup 后自动恢复）
//      pm2 startup        # 注册 systemd 启动脚本（开机自启）
//
// 密码从 .env 文件读（不入 git）

module.exports = {
  apps: [
    {
      name: 'fengshengda-frontend',
      cwd: './frontend',
      script: '../node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 5173',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 20,
      min_uptime: '30s',
      max_memory_restart: '512M',
      kill_timeout: 5000,
      out_file: '/root/.pm2/logs/fengshengda-frontend.out.log',
      error_file: '/root/.pm2/logs/fengshengda-frontend.error.log',
      time: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'fengshengda-server',
      cwd: './server',
      script: '../node_modules/.bin/ts-node-dev',
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
      // pm2 自动加载 cwd/.env 文件（node 20+）
      // 不要在这里写明文密码！
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
        DB_TYPE: 'mysql',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        DB_TYPE: 'mysql',
      },
    },
  ],
};
