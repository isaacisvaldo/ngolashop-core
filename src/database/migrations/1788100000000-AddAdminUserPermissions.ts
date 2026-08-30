import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminUserPermissions1788100000000 implements MigrationInterface {
  name = 'AddAdminUserPermissions1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_admin_user_permissions (
        id SERIAL PRIMARY KEY,
        admin_user_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_admin_user_permissions_user ON tb_admin_user_permissions (admin_user_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_admin_user_permissions ON tb_admin_user_permissions (admin_user_id, permission_id) WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tb_admin_user_permissions`);
  }
}
