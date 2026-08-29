import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanLimitUsers1788050000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS limit_users INTEGER;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tb_plans DROP COLUMN IF EXISTS limit_users;`,
    );
  }
}
