import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOperationsTables1788400000000 implements MigrationInterface {
  name = 'CreateOperationsTables1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Avaliações de produtos / lojas feitas por clientes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_reviews (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        product_id INTEGER NULL REFERENCES tb_products(id) ON DELETE CASCADE,
        client_id INTEGER NULL REFERENCES tb_clients(id) ON DELETE SET NULL,
        order_id INTEGER NULL REFERENCES tb_orders(id) ON DELETE SET NULL,
        author_name VARCHAR(150) NOT NULL,
        rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reviews_product ON tb_reviews (product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reviews_store ON tb_reviews (store_id)`);

    // Disputas entre clientes e lojas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_disputes (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES tb_orders(id) ON DELETE CASCADE,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        client_id INTEGER NULL REFERENCES tb_clients(id) ON DELETE SET NULL,
        reason VARCHAR(150) NOT NULL,
        description TEXT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        resolution TEXT NULL,
        resolved_by INTEGER NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);

    // Denúncias
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_reports (
        id SERIAL PRIMARY KEY,
        target_type VARCHAR(20) NOT NULL,
        target_id INTEGER NOT NULL,
        target_label VARCHAR(200) NULL,
        reason VARCHAR(150) NOT NULL,
        details TEXT NULL,
        client_id INTEGER NULL REFERENCES tb_clients(id) ON DELETE SET NULL,
        reporter_name VARCHAR(150) NULL,
        reporter_email VARCHAR(150) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);

    // Tickets de suporte
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_tickets (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(200) NOT NULL,
        requester_type VARCHAR(20) NOT NULL,
        client_id INTEGER NULL REFERENCES tb_clients(id) ON DELETE SET NULL,
        user_id INTEGER NULL REFERENCES tb_users(id) ON DELETE SET NULL,
        store_id INTEGER NULL REFERENCES tb_stores(id) ON DELETE SET NULL,
        requester_name VARCHAR(150) NOT NULL,
        requester_email VARCHAR(150) NULL,
        priority VARCHAR(10) NOT NULL DEFAULT 'medium',
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        assigned_admin_id INTEGER NULL REFERENCES tb_admin_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tb_tickets(id) ON DELETE CASCADE,
        author_type VARCHAR(20) NOT NULL,
        author_id INTEGER NULL,
        author_name VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Logs de auditoria do painel administrativo
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_user_id INTEGER NULL REFERENCES tb_admin_users(id) ON DELETE SET NULL,
        actor_name VARCHAR(150) NULL,
        actor_email VARCHAR(150) NULL,
        action VARCHAR(20) NOT NULL,
        entity VARCHAR(80) NOT NULL,
        entity_id VARCHAR(50) NULL,
        path VARCHAR(255) NOT NULL,
        details JSONB NULL,
        ip VARCHAR(64) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON tb_audit_logs (created_at DESC)`);

    // Configurações globais
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tb_settings (
        key VARCHAR(80) PRIMARY KEY,
        value TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'text',
        label VARCHAR(150) NOT NULL,
        description TEXT NULL,
        is_public BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      INSERT INTO tb_settings (key, value, type, label, description, is_public) VALUES
        ('platform_name', 'Kamba Shop', 'text', 'Nome da plataforma', 'Nome apresentado no marketplace público', true),
        ('dispute_window_days', '14', 'number', 'Prazo de disputa (dias)', 'Janela, após a entrega, para o cliente abrir disputa', true),
        ('currency', 'Kz', 'text', 'Moeda', 'Moeda de apresentação de valores', true),
        ('maintenance_mode', 'false', 'boolean', 'Modo de manutenção', 'Suspende temporariamente o site público', true),
        ('auto_approve_reviews', 'false', 'boolean', 'Aprovar avaliações automaticamente', 'Publica avaliações sem moderação prévia', false)
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tb_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_ticket_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_tickets`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_disputes`);
    await queryRunner.query(`DROP TABLE IF EXISTS tb_reviews`);
  }
}
