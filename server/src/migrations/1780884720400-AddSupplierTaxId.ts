// v0.2: 给 suppliers 表加 tax_id 字段（增值税开票用）
// 演示 typeorm migration:generate 工作流
// 真实使用：改完 entity 后跑 npm run migration:generate，自动出 SQL；本文件手动精简掉 generate 多余的"全表 CHANGE"
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierTaxId1780884720400 implements MigrationInterface {
  name = 'AddSupplierTaxId1780884720400';

  public async up(q: QueryRunner): Promise<void> {
    // 加 1 列：tax_id VARCHAR(50) NULL（增值税开票用，可选）
    await q.query(`ALTER TABLE \`suppliers\` ADD \`tax_id\` VARCHAR(50) NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    // 回滚：删列
    await q.query(`ALTER TABLE \`suppliers\` DROP COLUMN \`tax_id\``);
  }
}
