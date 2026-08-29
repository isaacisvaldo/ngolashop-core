import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUsersStoreColumn1788050000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure store_id column exists (may already exist from original migration)
    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE tb_users ADD COLUMN IF NOT EXISTS store_id INTEGER;
            EXCEPTION WHEN duplicate_column THEN null;
            END $$;
        `);
    // Recreate FK cleanly
    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE tb_users DROP CONSTRAINT IF EXISTS fk_users_store;
            EXCEPTION WHEN others THEN null;
            END $$;
        `);
    await queryRunner.query(`
            ALTER TABLE tb_users ADD CONSTRAINT fk_users_store
            FOREIGN KEY (store_id) REFERENCES tb_stores(id) ON DELETE CASCADE ON UPDATE CASCADE;
        `);
    // Ensure refresh_token exists
    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE tb_users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(512);
            EXCEPTION WHEN duplicate_column THEN null;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tb_users DROP CONSTRAINT IF EXISTS fk_users_store;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_users DROP COLUMN IF EXISTS refresh_token;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_users DROP COLUMN IF EXISTS store_id;`,
    );
  }
}
