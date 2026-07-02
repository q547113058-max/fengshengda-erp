// pm2 进程守护配置
// 正式服 (Ubuntu 22.04): pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'fengshengda-server',
      cwd: './server',
      script: 'dist/main.js',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      min_uptime: '30s',
      max_memory_restart: '768M',
      kill_timeout: 5000,
      time: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DB_TYPE: 'better-sqlite3',
        DB_PATH: '/home/ubuntu/data/erp-new/fengshengda.db',
      },
    },
  ],
};
