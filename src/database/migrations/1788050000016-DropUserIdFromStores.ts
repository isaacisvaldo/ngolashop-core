import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserIdFromStores1788050000016 implements MigrationInterface {
  name = 'DropUserIdFromStores1788050000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_stores" DROP CONSTRAINT IF EXISTS "FK_store_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tb_stores" DROP COLUMN IF EXISTS "user_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_stores" ADD COLUMN "user_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tb_stores" ADD CONSTRAINT "FK_store_user" FOREIGN KEY ("user_id") REFERENCES "tb_users"("id") ON DELETE SET NULL`,
    );
  }
}
