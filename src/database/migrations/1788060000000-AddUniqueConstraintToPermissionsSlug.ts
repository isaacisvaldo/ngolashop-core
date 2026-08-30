import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToPermissionsSlug1788060000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_permissions" ADD CONSTRAINT "UQ_permissions_slug" UNIQUE ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_permissions" DROP CONSTRAINT "UQ_permissions_slug"`,
    );
  }
}
