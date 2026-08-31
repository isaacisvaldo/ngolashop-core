import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsToStores1788050000019 implements MigrationInterface {
  name = 'AddSettingsToStores1788050000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = ['address', 'pickup_location', 'social_links', 'delivery_zones', 'payments', 'chatbot'];
    for (const col of columns) {
      const exists = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tb_stores' AND column_name = $1)`,
        [col],
      );
      if (!exists[0].exists) {
        const type = col.startsWith('social') || col.startsWith('delivery') || col === 'payments' || col === 'chatbot' ? 'jsonb' : 'varchar(255)';
        await queryRunner.query(`ALTER TABLE "tb_stores" ADD COLUMN "${col}" ${type}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_stores"
        DROP COLUMN IF EXISTS "chatbot",
        DROP COLUMN IF EXISTS "payments",
        DROP COLUMN IF EXISTS "delivery_zones",
        DROP COLUMN IF EXISTS "social_links",
        DROP COLUMN IF EXISTS "pickup_location",
        DROP COLUMN IF EXISTS "address"
    `);
  }
}
