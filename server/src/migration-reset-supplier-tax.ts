// 重置 suppliers 表的 tax_id 列（演示完可重复跑）
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
  // 删 tax_id 列（如果存在）
  try {
    await conn.query('ALTER TABLE suppliers DROP COLUMN tax_id');
    console.log('✓ DROP COLUMN suppliers.tax_id');
  } catch (e: any) {
    console.log('tax_id 不存在，跳过:', e.code);
  }
  // 清 migrations 表的 AddSupplierTaxId 记录
  await conn.query("DELETE FROM migrations WHERE name LIKE 'AddSupplierTaxId%'");
  console.log('✓ 清 migrations 表');
  await conn.close();
}
main().catch(e => { console.error(e); process.exit(1); });
