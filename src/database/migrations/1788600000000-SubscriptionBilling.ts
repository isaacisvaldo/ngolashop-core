import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Modelo de faturação Kamba Shop — subscrições dos vendedores:
 * 4 planos (Grátis, Crescer, Pro, Negócio), ciclos mensal/trimestral/anual,
 * faturas com comprovativo validado no admin, plano Fundador, teste de 14 dias,
 * tolerância de 5 dias e regresso ao Grátis ocultando (sem apagar) produtos.
 */
export class SubscriptionBilling1788600000000 implements MigrationInterface {
  name = 'SubscriptionBilling1788600000000';

  public async up(q: QueryRunner): Promise<void> {
    /* ------------------------------- Planos ------------------------------- */
    await q.query(`ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS slug VARCHAR(40) NULL`);
    await q.query(`ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS limit_highlights_per_month INTEGER NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS allows_coupons BOOLEAN NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS allows_remove_branding BOOLEAN NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS statistics_level VARCHAR(20) NOT NULL DEFAULT 'basic'`);
    await q.query(`ALTER TABLE tb_plans ADD COLUMN IF NOT EXISTS support_level VARCHAR(20) NOT NULL DEFAULT 'email'`);

    const plans = [
      // slug, name, desc, price, quarterly, annual, products, photos, users, highlights, coupons, branding, chatbot, domain, stats, support, advanced, priority, position
      ['gratis', 'Grátis', 'Para começar a vender sem custos', 0, null, null, 15, 2, 1, 0, false, false, false, false, 'basic', 'email', false, false, 1],
      ['crescer', 'Crescer', 'Para quem já vende e quer crescer', 4900, 13230, 49000, 100, 5, 1, 1, true, false, false, false, 'sales', 'email', false, false, 2],
      ['pro', 'Pro', 'Tudo para vender mais, com chatbot e destaques', 12900, 34830, 129000, null, 8, 3, 4, true, true, true, false, 'advanced', 'whatsapp', true, true, 3],
      ['negocio', 'Negócio', 'Para lojas maiores, com domínio próprio', 29900, 80730, 299000, null, 10, 10, 10, true, true, true, true, 'advanced_export', 'dedicated', true, true, 4],
    ] as const;

    // Reaproveita os planos existentes (Grátis=1, Pro antigo→Crescer, Premium→Pro) para manter as subscrições atuais
    const legacy: Record<string, string> = { gratis: 'Grátis', crescer: 'Pro', pro: 'Premium' };
    for (const p of plans) {
      const [slug, name, description, price, quarterly, annual, products, photos, users, highlights, coupons, branding, chatbot, domain, stats, support, advanced, priority, position] = p;
      const values = [name, description, price, quarterly, annual, products, photos, users, highlights, coupons, branding, chatbot, domain, stats, support, advanced, priority, position, slug];
      const setClause = `name=$1, description=$2, price=$3, price_quarterly=$4, price_annual=$5, limit_products=$6,
        limit_images_per_product=$7, limit_users=$8, limit_highlights_per_month=$9, allows_coupons=$10,
        allows_remove_branding=$11, allows_chatbot=$12, allows_custom_domain=$13, statistics_level=$14,
        support_level=$15, allows_advanced_statistics=$16, has_priority_support=$17, position=$18, slug=$19,
        limit_orders_per_month=NULL, is_active=true`;
      const byLegacy = legacy[slug]
        ? ((await q.query(`SELECT id FROM tb_plans WHERE name = $1 AND slug IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1`, [legacy[slug]])) as { id: number }[])
        : [];
      const bySlug = (await q.query(`SELECT id FROM tb_plans WHERE slug = $1 LIMIT 1`, [slug])) as { id: number }[];
      const id = bySlug[0]?.id ?? byLegacy[0]?.id;
      if (id) {
        await q.query(`UPDATE tb_plans SET ${setClause} WHERE id = $20`, [...values, id]);
      } else {
        await q.query(
          `INSERT INTO tb_plans (name, description, price, price_quarterly, price_annual, limit_products, limit_images_per_product,
             limit_users, limit_highlights_per_month, allows_coupons, allows_remove_branding, allows_chatbot, allows_custom_domain,
             statistics_level, support_level, allows_advanced_statistics, has_priority_support, position, slug, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true)`,
          values,
        );
      }
    }
    // Planos antigos que não fazem parte do novo modelo ficam inativos
    await q.query(`UPDATE tb_plans SET is_active = false WHERE slug IS NULL`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_slug ON tb_plans (slug) WHERE slug IS NOT NULL`);

    /* ----------------- Funcionalidades (página de preços) ----------------- */
    const features: Record<string, [string, boolean][]> = {
      gratis: [
        ['Até 15 produtos', true], ['2 fotos por produto', true], ['Loja pública /loja/nome + WhatsApp', true],
        ['Estatísticas básicas (visitas)', true], ['1 membro da equipa', true], ['Suporte por email', true],
        ['Destaques incluídos', false], ['Cupões de desconto', false], ['Chatbot da loja', false],
      ],
      crescer: [
        ['Até 100 produtos', true], ['5 fotos por produto', true], ['Loja pública /loja/nome + WhatsApp', true],
        ['Estatísticas de vendas e produtos mais vistos', true], ['1 destaque incluído por mês', true], ['Cupões de desconto', true],
        ['1 membro da equipa', true], ['Suporte por email', true], ['Chatbot da loja', false],
      ],
      pro: [
        ['Produtos ilimitados', true], ['8 fotos por produto', true], ['Estatísticas avançadas + mapa de vendas', true],
        ['4 destaques incluídos por mês', true], ['Chatbot da loja', true], ['Cupões de desconto', true],
        ['Remover a marca "Kamba Shop" da loja', true], ['3 membros da equipa', true], ['Suporte prioritário por WhatsApp', true],
      ],
      negocio: [
        ['Produtos ilimitados', true], ['10 fotos por produto', true], ['Estatísticas avançadas + exportação', true],
        ['10 destaques incluídos por mês', true], ['Chatbot, cupões e sem marca Kamba Shop', true],
        ['Domínio próprio (ex.: loja.marca.ao)', true], ['10 membros da equipa', true], ['Gestor de conta dedicado', true],
      ],
    };
    for (const [slug, list] of Object.entries(features)) {
      const rows = (await q.query(`SELECT id FROM tb_plans WHERE slug = $1`, [slug])) as { id: number }[];
      if (!rows[0]) continue;
      await q.query(`DELETE FROM tb_plan_features WHERE plan_id = $1`, [rows[0].id]);
      for (const [i, [text, included]] of list.entries()) {
        await q.query(`INSERT INTO tb_plan_features (plan_id, text, is_included, position) VALUES ($1, $2, $3, $4)`, [rows[0].id, text, included, i + 1]);
      }
    }

    /* ------------------------------- Lojas -------------------------------- */
    await q.query(`ALTER TABLE tb_stores ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE tb_stores ADD COLUMN IF NOT EXISTS founder_since TIMESTAMP NULL`);
    await q.query(`ALTER TABLE tb_stores ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE tb_stores ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(190) NULL`);
    await q.query(`ALTER TABLE tb_products ADD COLUMN IF NOT EXISTS hidden_by_plan BOOLEAN NOT NULL DEFAULT false`);

    /* ---------------------------- Subscrições ----------------------------- */
    await q.query(`ALTER TABLE tb_store_subscriptions ADD COLUMN IF NOT EXISTS cycle VARCHAR(20) NULL`);
    await q.query(`ALTER TABLE tb_store_subscriptions ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'payment'`);
    await q.query(`ALTER TABLE tb_store_subscriptions ADD COLUMN IF NOT EXISTS invoice_id INTEGER NULL`);
    await q.query(`ALTER TABLE tb_store_subscriptions ADD COLUMN IF NOT EXISTS notes TEXT NULL`);
    // Subscrições pendentes do fluxo antigo (auto-confirmáveis) deixam de ser válidas
    await q.query(`UPDATE tb_store_subscriptions SET status = 'cancelled' WHERE status = 'pending'`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_subscription_invoices (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        plan_id INTEGER NOT NULL REFERENCES tb_plans(id),
        cycle VARCHAR(20) NOT NULL,
        period_days INTEGER NOT NULL,
        base_amount DECIMAL(12,2) NOT NULL,
        discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        discount_reason VARCHAR(60) NULL,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(30) NULL,
        payment_reference VARCHAR(120) NULL,
        proof_url VARCHAR(500) NULL,
        proof_submitted_at TIMESTAMP NULL,
        reviewed_by INTEGER NULL REFERENCES tb_admin_users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP NULL,
        rejection_reason TEXT NULL,
        created_by INTEGER NULL REFERENCES tb_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_invoices_store ON tb_subscription_invoices (store_id, created_at DESC)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON tb_subscription_invoices (status)`);

    /* ---------------- Eventos (visitas, cliques, WhatsApp) ---------------- */
    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_store_events (
        id BIGSERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        product_id INTEGER NULL REFERENCES tb_products(id) ON DELETE SET NULL,
        type VARCHAR(30) NOT NULL,
        source VARCHAR(30) NOT NULL DEFAULT 'organic',
        highlight_id INTEGER NULL,
        visitor_id VARCHAR(64) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_events_store_time ON tb_store_events (store_id, created_at)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_events_product_time ON tb_store_events (product_id, created_at)`);

    /* ------------------------------- Cupões ------------------------------- */
    await q.query(`
      CREATE TABLE IF NOT EXISTS tb_coupons (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES tb_stores(id) ON DELETE CASCADE,
        code VARCHAR(40) NOT NULL,
        type VARCHAR(10) NOT NULL,
        value DECIMAL(12,2) NOT NULL,
        min_order_amount DECIMAL(12,2) NULL,
        max_uses INTEGER NULL,
        used_count INTEGER NOT NULL DEFAULT 0,
        starts_at TIMESTAMP NULL,
        ends_at TIMESTAMP NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_store_code ON tb_coupons (store_id, UPPER(code)) WHERE deleted_at IS NULL`);
    await q.query(`ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40) NULL`);
    await q.query(`ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0`);

    /* --------------------------- Configurações ---------------------------- */
    await q.query(`
      INSERT INTO tb_settings (key, value, type, label, description, is_public) VALUES
        ('trial_days', '14', 'number', 'Dias de teste do plano Pro', 'Cada loja nova recebe o plano Pro grátis durante este período', true),
        ('grace_days', '5', 'number', 'Tolerância após vencimento (dias)', 'Dias com o plano pago depois do vencimento antes de voltar ao Grátis', true),
        ('founder_slots', '50', 'number', 'Vagas do plano Fundador', 'Número de primeiros vendedores pagantes com desconto vitalício', true),
        ('founder_discount_percent', '50', 'number', 'Desconto Fundador (%)', 'Desconto aplicado enquanto a loja fundadora mantiver a subscrição', true),
        ('quarterly_discount_percent', '10', 'number', 'Desconto trimestral (%)', 'Informativo — os preços trimestrais estão definidos em cada plano', true),
        ('billing_multicaixa_express', '', 'text', 'Multicaixa Express (telefone)', 'Número que recebe pagamentos por Multicaixa Express', true),
        ('billing_reference_entity', '', 'text', 'Entidade para pagamento por referência', 'Entidade Multicaixa usada nas referências (validação manual)', true),
        ('billing_bank_name', '', 'text', 'Banco para transferências', 'Banco da conta que recebe as subscrições', true),
        ('billing_iban', '', 'text', 'IBAN para transferências', 'IBAN que os vendedores usam para pagar', true),
        ('billing_account_holder', '', 'text', 'Titular da conta', 'Nome do titular da conta bancária', true)
      ON CONFLICT (key) DO NOTHING
    `);

    /* -------------------- Permissões (novo significado) ------------------- */
    await q.query(`UPDATE tb_permissions SET description = 'Visualizar faturação (receitas e métricas)' WHERE slug = 'finance.read'`);
    await q.query(`UPDATE tb_permissions SET description = 'Gerir faturação' WHERE slug = 'finance.write'`);
    await q.query(`UPDATE tb_permissions SET description = 'Visualizar pagamentos de subscrições' WHERE slug = 'withdrawal.read'`);
    await q.query(`UPDATE tb_permissions SET description = 'Validar pagamentos de subscrições' WHERE slug = 'withdrawal.write'`);
    await q.query(`UPDATE tb_permissions SET description = 'Visualizar subscrições das lojas' WHERE slug = 'commission.read'`);
    await q.query(`UPDATE tb_permissions SET description = 'Gerir subscrições das lojas' WHERE slug = 'commission.write'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DELETE FROM tb_settings WHERE key IN ('trial_days','grace_days','founder_slots','founder_discount_percent','quarterly_discount_percent','billing_multicaixa_express','billing_reference_entity','billing_bank_name','billing_iban','billing_account_holder')`);
    await q.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS discount_amount`);
    await q.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS coupon_code`);
    await q.query(`DROP TABLE IF EXISTS tb_coupons`);
    await q.query(`DROP TABLE IF EXISTS tb_store_events`);
    await q.query(`DROP TABLE IF EXISTS tb_subscription_invoices`);
    for (const c of ['notes', 'invoice_id', 'source', 'cycle']) await q.query(`ALTER TABLE tb_store_subscriptions DROP COLUMN IF EXISTS ${c}`);
    await q.query(`ALTER TABLE tb_products DROP COLUMN IF EXISTS hidden_by_plan`);
    for (const c of ['custom_domain', 'hide_branding', 'founder_since', 'is_founder']) await q.query(`ALTER TABLE tb_stores DROP COLUMN IF EXISTS ${c}`);
    await q.query(`DROP INDEX IF EXISTS uq_plans_slug`);
    for (const c of ['support_level', 'statistics_level', 'allows_remove_branding', 'allows_coupons', 'limit_highlights_per_month', 'slug']) {
      await q.query(`ALTER TABLE tb_plans DROP COLUMN IF EXISTS ${c}`);
    }
  }
}
