import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutFieldsAndFavorites1788500000000 implements MigrationInterface {
  name = 'AddCheckoutFieldsAndFavorites1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) NOT NULL DEFAULT 'delivery'`);
    await queryRunner.query(`ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS delivery_zone VARCHAR(120) NULL`);
    await queryRunner.query(`ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS delivery_days INTEGER NULL`);
    await queryRunner.query(`ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_favorites (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES tb_clients(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES tb_products(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_favorites_client_product UNIQUE (client_id, product_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tb_favorites`);
    await queryRunner.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS payment_method`);
    await queryRunner.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS delivery_days`);
    await queryRunner.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS delivery_zone`);
    await queryRunner.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS delivery_type`);
  }
}
