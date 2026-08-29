import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CompleteSchema1788040000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Add missing columns to tb_stores ──
    await queryRunner.query(`
            ALTER TABLE tb_stores ADD COLUMN IF NOT EXISTS plan_id INTEGER;
        `);
    await queryRunner.query(`
            ALTER TABLE tb_stores ADD CONSTRAINT fk_stores_plan
            FOREIGN KEY (plan_id) REFERENCES tb_plans(id) ON DELETE SET NULL ON UPDATE CASCADE;
        `);

    // ── 2. Add missing column to tb_plans ──
    await queryRunner.query(`
            ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS limit_users INTEGER
            COMMENT 'Max users per store. null = unlimited.';
        `);

    // ── 3. Add missing store_id column to tb_users ──
    // The FK already exists from the original migration but the column was never created
    await queryRunner.query(`
            ALTER TABLE tb_users ADD COLUMN IF NOT EXISTS store_id INTEGER;
        `);
    // Drop the FK that references store_id before it existed, then recreate
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

    // ── 4. Add refresh_token columns ──
    await queryRunner.query(`
            ALTER TABLE tb_users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(512);
        `);

    // ── 5. Create tb_admin_users ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_admin_users') THEN
                    CREATE TABLE tb_admin_users (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(150) NOT NULL,
                        email VARCHAR(150) NOT NULL UNIQUE,
                        password VARCHAR(255) NOT NULL,
                        phone VARCHAR(20),
                        is_active BOOLEAN NOT NULL DEFAULT true,
                        is_root BOOLEAN NOT NULL DEFAULT false,
                        role_id INTEGER,
                        refresh_token VARCHAR(512),
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    );
                END IF;
            END $$;
        `);
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_users_role') THEN
                    ALTER TABLE tb_admin_users ADD CONSTRAINT fk_admin_users_role
                    FOREIGN KEY (role_id) REFERENCES tb_roles(id) ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);

    // ── 6. Create tb_products ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_products') THEN
                    CREATE TABLE tb_products (
                        id SERIAL PRIMARY KEY,
                        store_id INTEGER NOT NULL,
                        category_id INTEGER,
                        name VARCHAR(200) NOT NULL,
                        slug VARCHAR(220) NOT NULL,
                        description TEXT,
                        price DECIMAL(12,2) NOT NULL DEFAULT 0,
                        compare_at_price DECIMAL(12,2),
                        stock_quantity INTEGER NOT NULL DEFAULT 0,
                        sku VARCHAR(100),
                        is_active BOOLEAN NOT NULL DEFAULT true,
                        is_featured BOOLEAN NOT NULL DEFAULT false,
                        average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
                        total_sales INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP,
                        CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES tb_stores(id) ON DELETE CASCADE ON UPDATE CASCADE,
                        CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES tb_categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
                        CONSTRAINT uq_products_store_slug UNIQUE (store_id, slug)
                    );
                END IF;
            END $$;
        `);

    // ── 7. Create tb_product_images ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_product_images') THEN
                    CREATE TABLE tb_product_images (
                        id SERIAL PRIMARY KEY,
                        product_id INTEGER NOT NULL,
                        url VARCHAR(255) NOT NULL,
                        alt_text VARCHAR(255),
                        position INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP,
                        CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES tb_products(id) ON DELETE CASCADE ON UPDATE CASCADE
                    );
                END IF;
            END $$;
        `);

    // ── 8. Create tb_orders ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_orders') THEN
                    CREATE TABLE tb_orders (
                        id SERIAL PRIMARY KEY,
                        store_id INTEGER NOT NULL,
                        customer_name VARCHAR(150) NOT NULL,
                        customer_email VARCHAR(150),
                        customer_phone VARCHAR(20) NOT NULL,
                        shipping_address TEXT,
                        status VARCHAR(30) NOT NULL DEFAULT 'pending',
                        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
                        shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
                        total DECIMAL(12,2) NOT NULL DEFAULT 0,
                        notes TEXT,
                        tracking_code VARCHAR(100),
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP,
                        CONSTRAINT fk_orders_store FOREIGN KEY (store_id) REFERENCES tb_stores(id) ON DELETE CASCADE ON UPDATE CASCADE
                    );
                END IF;
            END $$;
        `);

    // ── 9. Create tb_order_items ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_order_items') THEN
                    CREATE TABLE tb_order_items (
                        id SERIAL PRIMARY KEY,
                        order_id INTEGER NOT NULL,
                        product_id INTEGER NOT NULL,
                        product_name VARCHAR(200) NOT NULL,
                        product_price DECIMAL(12,2) NOT NULL,
                        quantity INTEGER NOT NULL DEFAULT 1,
                        subtotal DECIMAL(12,2) NOT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES tb_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
                        CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES tb_products(id) ON DELETE CASCADE ON UPDATE CASCADE
                    );
                END IF;
            END $$;
        `);

    // ── 10. Create tb_order_status_history ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_order_status_history') THEN
                    CREATE TABLE tb_order_status_history (
                        id SERIAL PRIMARY KEY,
                        order_id INTEGER NOT NULL,
                        status VARCHAR(30) NOT NULL,
                        note TEXT,
                        changed_by INTEGER,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES tb_orders(id) ON DELETE CASCADE ON UPDATE CASCADE
                    );
                END IF;
            END $$;
        `);

    // ── 11. Create tb_payments ──
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tb_payments') THEN
                    CREATE TABLE tb_payments (
                        id SERIAL PRIMARY KEY,
                        order_id INTEGER NOT NULL,
                        method VARCHAR(50) NOT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'pending',
                        amount DECIMAL(12,2) NOT NULL,
                        reference VARCHAR(255),
                        paid_at TIMESTAMP,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES tb_orders(id) ON DELETE CASCADE ON UPDATE CASCADE
                    );
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tb_payments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_order_status_history;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_order_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_orders;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_product_images;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_admin_users;`);
    await queryRunner.query(
      `ALTER TABLE tb_users DROP CONSTRAINT IF EXISTS fk_users_store;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_users DROP COLUMN IF EXISTS refresh_token;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_users DROP COLUMN IF EXISTS store_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_plans DROP COLUMN IF EXISTS limit_users;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_stores DROP CONSTRAINT IF EXISTS fk_stores_plan;`,
    );
    await queryRunner.query(
      `ALTER TABLE tb_stores DROP COLUMN IF EXISTS plan_id;`,
    );
  }
}
