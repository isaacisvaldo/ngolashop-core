import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Destaques e publicidade: formatos com vagas limitadas, carteira de saldo com bónus,
 * destaques incluídos no plano, oferta de reativação e relatório por destaque.
 */
export class Highlights1788700000000 implements MigrationInterface {
  name = 'Highlights1788700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_highlight_formats (
        key VARCHAR(30) PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        description TEXT NULL,
        target VARCHAR(20) NOT NULL,
        slots INTEGER NOT NULL,
        prices JSONB NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await q.query(`
      INSERT INTO tb_highlight_formats (key, name, description, target, slots, prices, position) VALUES
        ('category_top', 'Topo da categoria', 'O produto aparece primeiro quando o comprador escolhe a categoria', 'category', 5, '{"3":800,"7":1500,"15":2700}', 1),
        ('search_top', 'Topo da pesquisa', 'O produto aparece primeiro quando alguém pesquisa a palavra-chave', 'keyword', 5, '{"3":1000,"7":2000,"15":3500}', 2),
        ('home_carousel', 'Carrossel da página inicial', 'O produto aparece no carrossel de destaques da página inicial', 'global', 6, '{"3":2500,"7":5000,"15":9000}', 3),
        ('store_featured', 'Loja em destaque', 'A loja aparece na secção «Lojas recomendadas»', 'store', 8, '{"3":1500,"7":3000,"15":5500}', 4)
      ON CONFLICT (key) DO NOTHING
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_wallet_packages (
        id SERIAL PRIMARY KEY,
        pay_amount DECIMAL(12,2) NOT NULL,
        credit_amount DECIMAL(12,2) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const pk = (await q.query(`SELECT COUNT(*) AS n FROM tb_wallet_packages`)) as { n: string }[];
    if (Number(pk[0]?.n ?? 0) === 0) {
      await q.query(`INSERT INTO tb_wallet_packages (pay_amount, credit_amount) VALUES (5000, 5500), (10000, 11500)`);
    }

    // Carregamentos da carteira usam a mesma fila de validação das faturas
    await q.query(`ALTER TABLE tb_subscription_invoices ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'subscription'`);
    await q.query(`ALTER TABLE tb_subscription_invoices ADD COLUMN IF NOT EXISTS credit_amount DECIMAL(12,2) NULL`);
    await q.query(`ALTER TABLE tb_subscription_invoices ALTER COLUMN plan_id DROP NOT NULL`);
    await q.query(`ALTER TABLE tb_subscription_invoices ALTER COLUMN cycle DROP NOT NULL`);
    await q.query(`ALTER TABLE tb_subscription_invoices ALTER COLUMN period_days DROP NOT NULL`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_wallet_transactions (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        balance_after DECIMAL(12,2) NOT NULL,
        invoice_id INTEGER NULL REFERENCES tb_subscription_invoices(id) ON DELETE SET NULL,
        highlight_id INTEGER NULL,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_wallet_store ON tb_wallet_transactions (store_id, id DESC)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_highlights (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        product_id INTEGER NULL REFERENCES tb_products(id) ON DELETE CASCADE,
        format VARCHAR(30) NOT NULL REFERENCES tb_highlight_formats(key),
        category_id INTEGER NULL REFERENCES tb_categories(id) ON DELETE SET NULL,
        keyword VARCHAR(60) NULL,
        duration_days INTEGER NOT NULL,
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        paid_with VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'booked',
        report_sent_at TIMESTAMP NULL,
        created_by INTEGER NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_highlights_pool ON tb_highlights (format, starts_at, ends_at) WHERE status = 'booked'`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_highlights_store ON tb_highlights (store_id, created_at DESC)`);

    // Créditos de destaque grátis (oferta de reativação e ofertas do admin)
    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_highlight_credits (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        source VARCHAR(20) NOT NULL,
        format VARCHAR(30) NOT NULL,
        duration_days INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        highlight_id INTEGER NULL REFERENCES tb_highlights(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await q.query(`
      INSERT INTO tb_settings (key, value, type, label, description, is_public) VALUES
        ('included_highlight_format', 'category_top', 'text', 'Formato dos destaques incluídos no plano', 'category_top, search_top, home_carousel ou store_featured', true),
        ('included_highlight_days', '3', 'number', 'Duração dos destaques incluídos (dias)', 'Cada destaque incluído no plano cobre este número de dias', true),
        ('reactivation_days_without_sales', '30', 'number', 'Dias sem vendas para oferta de reativação', 'Lojas com produtos e sem vendas neste período recebem um destaque grátis', false),
        ('reactivation_highlight_days', '3', 'number', 'Duração do destaque de reativação (dias)', 'Duração do destaque grátis oferecido para reativar a loja', false)
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DELETE FROM tb_settings WHERE key IN ('included_highlight_format','included_highlight_days','reactivation_days_without_sales','reactivation_highlight_days')`);
    await q.query(`DROP TABLE IF EXISTS tb_highlight_credits`);
    await q.query(`DROP TABLE IF EXISTS tb_highlights`);
    await q.query(`DROP TABLE IF EXISTS tb_wallet_transactions`);
    await q.query(`ALTER TABLE tb_subscription_invoices DROP COLUMN IF EXISTS credit_amount`);
    await q.query(`ALTER TABLE tb_subscription_invoices DROP COLUMN IF EXISTS kind`);
    await q.query(`DROP TABLE IF EXISTS tb_wallet_packages`);
    await q.query(`DROP TABLE IF EXISTS tb_highlight_formats`);
  }
}
