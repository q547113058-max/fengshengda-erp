import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerChanges1780900000000 implements MigrationInterface {
  name = 'CustomerChanges1780900000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1. 移除 nature 列
    await q.query(`ALTER TABLE customers DROP COLUMN IF EXISTS nature`);
    // 2. 新增 code 列（客户编号）
    await q.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS code VARCHAR(30) NOT NULL DEFAULT ''`);
    // 3. 新增 created_by_user_id 列（录入人）
    await q.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_user_id INT NOT NULL DEFAULT 0`);
    // 4. 新增 allow_share 列（是否允许共享给其他业务员）
    await q.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS allow_share TINYINT(1) NOT NULL DEFAULT 0`);
    // 5. 新增 shared_to_user_id 列（共享给谁）
    await q.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS shared_to_user_id INT`);
    // 6. 去掉 nature 索引（如果有的话，这里不需要处理）
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE customers DROP COLUMN IF EXISTS shared_to_user_id`);
    await q.query(`ALTER TABLE customers DROP COLUMN IF EXISTS allow_share`);
    await q.query(`ALTER TABLE customers DROP COLUMN IF EXISTS created_by_user_id`);
    await q.query(`ALTER TABLE customers DROP COLUMN IF EXISTS code`);
    await q.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS nature VARCHAR(40)`);
  }
}
