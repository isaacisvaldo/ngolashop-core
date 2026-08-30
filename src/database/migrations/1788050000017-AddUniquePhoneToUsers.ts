import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniquePhoneToUsers1788050000017 implements MigrationInterface {
  name = 'AddUniquePhoneToUsers1788050000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_users" ADD CONSTRAINT "UQ_users_phone" UNIQUE ("phone")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tb_users" DROP CONSTRAINT IF EXISTS "UQ_users_phone"`,
    );
  }
}
