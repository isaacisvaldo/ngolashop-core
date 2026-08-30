import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIdToStores1788050000018 implements MigrationInterface {
  name = 'AddCategoryIdToStores1788050000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_stores" ADD COLUMN "category_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tb_stores" ADD CONSTRAINT "FK_store_category" FOREIGN KEY ("category_id") REFERENCES "tb_categories"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_stores" DROP CONSTRAINT IF EXISTS "FK_store_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tb_stores" DROP COLUMN IF EXISTS "category_id"`,
    );
  }
}
