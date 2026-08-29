import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddressesTable1788050000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_addresses') THEN
                    CREATE TABLE tb_addresses (
                        id SERIAL PRIMARY KEY,
                        store_id INTEGER,
                        label VARCHAR(100),
                        street VARCHAR(255) NOT NULL,
                        city VARCHAR(100) NOT NULL,
                        province_id INTEGER,
                        postal_code VARCHAR(20),
                        country VARCHAR(100) NOT NULL DEFAULT 'Angola',
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    );
                END IF;
            END $$;
        `);
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_addresses_store') THEN
                    ALTER TABLE tb_addresses ADD CONSTRAINT fk_addresses_store
                    FOREIGN KEY (store_id) REFERENCES tb_stores(id) ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_addresses_province') THEN
                    ALTER TABLE tb_addresses ADD CONSTRAINT fk_addresses_province
                    FOREIGN KEY (province_id) REFERENCES tb_provinces(id) ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tb_addresses;`);
  }
}
