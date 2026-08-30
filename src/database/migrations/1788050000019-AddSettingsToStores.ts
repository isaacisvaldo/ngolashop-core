import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsToStores1788050000019 implements MigrationInterface {
  name = 'AddSettingsToStores1788050000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_stores"
        ADD COLUMN "address" varchar(255),
        ADD COLUMN "pickup_location" varchar(255),
        ADD COLUMN "social_links" jsonb,
        ADD COLUMN "delivery_zones" jsonb,
        ADD COLUMN "payments" jsonb,
        ADD COLUMN "chatbot" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_stores"
        DROP COLUMN "chatbot",
        DROP COLUMN "payments",
        DROP COLUMN "delivery_zones",
        DROP COLUMN "social_links",
        DROP COLUMN "pickup_location",
        DROP COLUMN "address"
    `);
  }
}
