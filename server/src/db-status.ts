// 看 MySQL 库 schema 状态
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
  const tables: any[] = await conn.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name",
    [process.env.DB_NAME],
  );
  console.log('Tables in DB:');
  for (const t of tables) console.log(' -', t.table_name);
  // migrations 表
  const mig: any[] = await conn.query('SELECT * FROM migrations');
  console.log('Migrations:');
  for (const m of mig) console.log(' -', m);
  await conn.close();
}
main().catch(e => { console.error(e); process.exit(1); });
