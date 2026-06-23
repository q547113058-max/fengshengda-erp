import { MigrationInterface, QueryRunner } from 'typeorm';

export class SharedToUserIdsVarchar1780900000001 implements MigrationInterface {
  name = 'SharedToUserIdsVarchar1780900000001';

  public async up(q: QueryRunner): Promise<void> {
    // 把 shared_to_user_id INT 改为 shared_to_user_ids VARCHAR（存逗号分隔的多个 ID）
    await q.query(`ALTER TABLE customers CHANGE COLUMN shared_to_user_id shared_to_user_ids VARCHAR(500) NULL DEFAULT NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE customers CHANGE COLUMN shared_to_user_ids shared_to_user_id INT NULL DEFAULT NULL`);
  }
}
