// 重置 migrations 表（保留 schema）— 强制重跑
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { config } from 'dotenv';
config();

async function main() {
  const conn = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('DROP TABLE IF EXISTS `migrations`');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('✅ migrations 表已清空');
  await conn.close();
}
main().catch(e => { console.error(e); process.exit(1); });
