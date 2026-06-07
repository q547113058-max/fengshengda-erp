// 重置 MySQL 库 + 触发 seed
// 用法：npm run seed:reset
// 必须在 server/ 跑
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
  console.log('⚠️  即将 DROP 全部表（重置）...');
  // 关外键检查
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  // 拿到所有表名
  const tables: any[] = await conn.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
    [process.env.DB_NAME],
  );
  for (const t of tables) {
    await conn.query(`DROP TABLE IF EXISTS \`${t.table_name}\``);
    console.log('  - dropped', t.table_name);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.close();
  console.log('✅ 重置完成；下次启动 server 时会自动重建 + seed');
}
main().catch(e => { console.error(e); process.exit(1); });
