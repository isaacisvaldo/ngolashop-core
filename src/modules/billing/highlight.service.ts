import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import {
  Highlight, HighlightCredit, HighlightFormat, WalletPackage,
  type HighlightFormatKey, type HighlightPaidWith,
} from './entities/highlight.entity';
import { Product } from '../product/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { User } from '../shared/auth/entities/user.entity';
import { BillingService } from './billing.service';
import { WalletService } from './wallet.service';
import { SettingService } from '../setting/setting.service';
import { EmailService } from '../shared/email/email.service';

const DAY = 24 * 60 * 60 * 1000;
export const HIGHLIGHT_DURATIONS = [3, 7, 15];

export interface BookHighlightInput {
  format: HighlightFormatKey;
  days: number;
  productId?: number | undefined;
  categoryId?: number | undefined;
  keyword?: string | undefined;
  /** wallet (saldo) | included (incluído no plano) | credit (oferta de reativação / admin) */
  payWith: 'wallet' | 'included' | 'credit';
  creditId?: number | undefined;
}

export type HighlightState = 'scheduled' | 'active' | 'finished' | 'cancelled';

@Injectable()
export class HighlightService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HighlightService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(HighlightFormat) private readonly formatRepository: Repository<HighlightFormat>,
    @InjectRepository(Highlight) private readonly highlightRepository: Repository<Highlight>,
    @InjectRepository(HighlightCredit) private readonly creditRepository: Repository<HighlightCredit>,
    @InjectRepository(WalletPackage) private readonly packageRepository: Repository<WalletPackage>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly billing: BillingService,
    private readonly wallet: WalletService,
    private readonly settings: SettingService,
    private readonly email: EmailService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.runLifecycle(), 20_000);
    this.timer = setInterval(() => void this.runLifecycle(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /* ------------------------------------------------------------------ */
  /* Formatos, vagas e preços                                            */
  /* ------------------------------------------------------------------ */

  formats(includeInactive = false) {
    return this.formatRepository.find({ where: includeInactive ? {} : { isActive: true }, order: { position: 'ASC' } });
  }

  private async format(key: string) {
    const f = await this.formatRepository.findOne({ where: { key: key as HighlightFormatKey, isActive: true } });
    if (!f) throw new NotFoundException('Formato de destaque indisponível');
    return f;
  }

  static normalizeKeyword(k: string) {
    return k.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  }

  /** Identifica o "conjunto" de vagas: a mesma categoria, a mesma palavra-chave ou o carrossel global. */
  private poolWhere(format: HighlightFormat, target: { categoryId?: number | null; keyword?: string | null }) {
    const base = { format: format.key, status: 'booked' as const };
    if (format.target === 'category') return { ...base, categoryId: target.categoryId ?? -1 };
    if (format.target === 'keyword') return { ...base, keyword: target.keyword ?? '' };
    return base;
  }

  /**
   * Primeira data a partir da qual há vaga durante todo o período pedido.
   * Percorre o início imediato e o fim de cada destaque existente (momentos em que se liberta uma vaga).
   */
  async nextAvailableStart(format: HighlightFormat, target: { categoryId?: number | null; keyword?: string | null }, days: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Highlight) : this.highlightRepository;
    const now = new Date();
    const existing = await repo.find({ where: { ...this.poolWhere(format, target), endsAt: MoreThan(now) }, order: { endsAt: 'ASC' } });
    const candidates = [now, ...existing.map((e) => e.endsAt)].filter((d) => d >= now).sort((a, b) => a.getTime() - b.getTime());
    for (const start of candidates) {
      const end = new Date(start.getTime() + days * DAY);
      const overlapping = existing.filter((e) => e.startsAt < end && e.endsAt > start);
      const points = [start, ...overlapping.map((e) => e.startsAt).filter((p) => p > start && p < end)];
      const peak = Math.max(0, ...points.map((p) => overlapping.filter((e) => e.startsAt <= p && e.endsAt > p).length));
      if (peak < format.slots) return start;
    }
    return candidates[candidates.length - 1] ?? now;
  }

  /** Destaques incluídos no plano ainda disponíveis este mês. */
  async includedRemaining(storeId: number) {
    const { plan } = await this.billing.getEffectivePlan(storeId);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const used = await this.highlightRepository.count({
      where: { storeId, paidWith: 'included', status: 'booked', createdAt: MoreThan(monthStart) },
    });
    return {
      limit: plan.limitHighlightsPerMonth,
      used,
      remaining: Math.max(0, plan.limitHighlightsPerMonth - used),
      format: (await this.settings.findPublic())['included_highlight_format'] as HighlightFormatKey ?? 'category_top',
      days: await this.settings.getNumber('included_highlight_days', 3),
    };
  }

  async credits(storeId: number) {
    return this.creditRepository.find({
      where: { storeId, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { expiresAt: 'ASC' },
    });
  }

  /** Resumo para o separador «Destaques» do vendedor. */
  async storeSummary(storeId: number) {
    const [balance, included, credits, formats, packages, history] = await Promise.all([
      this.wallet.balance(storeId),
      this.includedRemaining(storeId),
      this.credits(storeId),
      this.formats(),
      this.packageRepository.find({ where: { isActive: true }, order: { payAmount: 'ASC' } }),
      this.wallet.history(storeId),
    ]);
    return { balance, included, credits, formats, packages, wallet: history };
  }

  async quote(storeId: number, input: { format: HighlightFormatKey; days: number; categoryId?: number | undefined; keyword?: string | undefined; productId?: number | undefined }) {
    const format = await this.format(input.format);
    const price = format.prices[String(input.days)];
    if (price === undefined) throw new BadRequestException('Duração indisponível para este formato');
    const target = await this.resolveTarget(storeId, format, input);
    const start = await this.nextAvailableStart(format, target, input.days);
    return {
      format: format.key,
      days: input.days,
      price: Number(price),
      categoryId: target.categoryId,
      keyword: target.keyword,
      availableFrom: start,
      availableNow: start.getTime() - Date.now() < 60_000,
      slots: format.slots,
    };
  }

  private async resolveTarget(storeId: number, format: HighlightFormat, input: { categoryId?: number | undefined; keyword?: string | undefined; productId?: number | undefined }) {
    let categoryId: number | null = null;
    let keyword: string | null = null;
    if (format.target === 'category') {
      categoryId = input.categoryId ?? null;
      if (!categoryId && input.productId) {
        const p = await this.productRepository.findOne({ where: { id: input.productId, storeId }, select: { id: true, categoryId: true } });
        categoryId = p?.categoryId ?? null;
      }
      if (!categoryId) throw new BadRequestException('Escolha a categoria onde o produto vai aparecer em destaque');
    }
    if (format.target === 'keyword') {
      keyword = HighlightService.normalizeKeyword(input.keyword ?? '');
      if (keyword.length < 2 || keyword.length > 40) throw new BadRequestException('Indique uma palavra-chave com 2 a 40 caracteres');
    }
    return { categoryId, keyword };
  }

  /* ------------------------------------------------------------------ */
  /* Compra, cancelamento                                                */
  /* ------------------------------------------------------------------ */

  async book(storeId: number, userId: number | null, input: BookHighlightInput, adminGrant = false) {
    const format = await this.format(input.format);
    const listPrice = format.prices[String(input.days)];
    if (listPrice === undefined) throw new BadRequestException('Duração indisponível para este formato');

    const store = await this.storeRepository.findOne({ where: { id: storeId } });
    if (!store?.isActive || !store.isPublished) {
      throw new BadRequestException('A loja tem de estar publicada no marketplace para comprar destaques');
    }

    let productId: number | null = null;
    if (format.target !== 'store') {
      if (!input.productId) throw new BadRequestException('Escolha o produto a destacar');
      const product = await this.productRepository.findOne({ where: { id: input.productId, storeId } });
      if (!product) throw new NotFoundException('Produto não encontrado');
      if (!product.isActive || !product.isPublished || product.hiddenByPlan) {
        throw new BadRequestException('O produto tem de estar ativo e publicado para ser destacado');
      }
      productId = product.id;
    }
    const target = await this.resolveTarget(storeId, format, input);

    // Validação do meio de pagamento (fora da transação: só leituras)
    let paidWith: HighlightPaidWith = adminGrant ? 'admin' : 'wallet';
    let price = adminGrant ? 0 : Number(listPrice);
    let credit: HighlightCredit | null = null;
    if (!adminGrant && input.payWith === 'included') {
      const inc = await this.includedRemaining(storeId);
      if (inc.remaining <= 0) throw new BadRequestException('Já usou os destaques incluídos no plano este mês');
      if (inc.format !== format.key || inc.days !== input.days) {
        throw new BadRequestException(`Os destaques incluídos no plano são «${inc.format === format.key ? format.name : inc.format}» de ${inc.days} dias`);
      }
      paidWith = 'included';
      price = 0;
    } else if (!adminGrant && input.payWith === 'credit') {
      credit = await this.creditRepository.findOne({ where: { id: input.creditId ?? -1, storeId, usedAt: IsNull(), expiresAt: MoreThan(new Date()) } });
      if (!credit) throw new BadRequestException('Oferta de destaque inválida ou expirada');
      if (credit.format !== format.key || credit.durationDays !== input.days) {
        throw new BadRequestException('Esta oferta é para outro formato ou duração');
      }
      paidWith = credit.source === 'reactivation' ? 'reactivation' : 'admin';
      price = 0;
    }

    return this.highlightRepository.manager.transaction(async (m) => {
      // Bloqueio por conjunto de vagas: impede que duas compras simultâneas ocupem a mesma última vaga
      await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`hl:${format.key}:${target.categoryId ?? ''}:${target.keyword ?? ''}`]);
      const start = await this.nextAvailableStart(format, target, input.days, m);
      const highlight = await m.getRepository(Highlight).save(
        m.getRepository(Highlight).create({
          storeId,
          productId,
          format: format.key,
          categoryId: target.categoryId,
          keyword: target.keyword,
          durationDays: input.days,
          startsAt: start,
          endsAt: new Date(start.getTime() + input.days * DAY),
          price,
          paidWith,
          status: 'booked',
          createdBy: userId,
        }),
      );
      if (paidWith === 'wallet' && price > 0) {
        await this.wallet.move(m, storeId, -price, 'spend', { highlightId: highlight.id, notes: `${format.name} · ${input.days} dias` });
      }
      if (credit) {
        await m.getRepository(HighlightCredit).update(credit.id, { usedAt: new Date(), highlightId: highlight.id });
      }
      return highlight;
    });
  }

  async cancel(storeId: number, id: number) {
    const h = await this.highlightRepository.findOne({ where: { id, storeId } });
    if (!h || h.status === 'cancelled') throw new NotFoundException('Destaque não encontrado');
    if (h.startsAt <= new Date()) throw new BadRequestException('Só é possível cancelar destaques que ainda não começaram');
    await this.highlightRepository.manager.transaction(async (m) => {
      await m.getRepository(Highlight).update(h.id, { status: 'cancelled' });
      if (h.paidWith === 'wallet' && Number(h.price) > 0) {
        await this.wallet.move(m, storeId, Number(h.price), 'refund', { highlightId: h.id, notes: 'Cancelamento de destaque agendado' });
      }
      await m.getRepository(HighlightCredit).update({ highlightId: h.id }, { usedAt: null, highlightId: null });
    });
    return { message: 'Destaque cancelado' };
  }

  /* ------------------------------------------------------------------ */
  /* Relatório                                                           */
  /* ------------------------------------------------------------------ */

  state(h: Highlight, now = new Date()): HighlightState {
    if (h.status === 'cancelled') return 'cancelled';
    if (h.startsAt > now) return 'scheduled';
    if (h.endsAt > now) return 'active';
    return 'finished';
  }

  /** Visualizações, cliques, WhatsApp e pedidos no período do destaque vs. período anterior de igual duração. */
  async report(h: Highlight) {
    const now = new Date();
    const start = h.startsAt;
    const end = h.endsAt < now ? h.endsAt : now;
    if (end <= start) return null;
    const len = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - len);
    const m = this.highlightRepository.manager;

    const period = async (from: Date, to: Date) => {
      const ev = (await m.query(
        `SELECT
            COUNT(*) FILTER (WHERE type = $4) AS views,
            COUNT(*) FILTER (WHERE type = 'product_click' AND ($5::int IS NULL OR highlight_id = $5)) AS clicks,
            COUNT(*) FILTER (WHERE type = 'whatsapp_click') AS whatsapp
           FROM tb_store_events
          WHERE store_id = $1 AND created_at >= $2 AND created_at < $3
            AND ($6::int IS NULL OR product_id = $6 OR (type = 'whatsapp_click' AND product_id IS NULL))`,
        [h.storeId, from, to, h.productId ? 'product_view' : 'store_view', from === start ? h.id : null, h.productId],
      )) as { views: string; clicks: string; whatsapp: string }[];
      const ord = (await m.query(
        `SELECT COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(${h.productId ? 'i.subtotal' : 'o.total'}), 0) AS revenue
           FROM tb_orders o ${h.productId ? 'JOIN tb_order_items i ON i.order_id = o.id AND i.product_id = $4' : ''}
          WHERE o.store_id = $1 AND o.created_at >= $2 AND o.created_at < $3 AND o.status <> 'cancelled' AND o.deleted_at IS NULL`,
        h.productId ? [h.storeId, from, to, h.productId] : [h.storeId, from, to],
      )) as { orders: string; revenue: string }[];
      return {
        views: Number(ev[0]?.views ?? 0),
        clicks: Number(ev[0]?.clicks ?? 0),
        whatsapp: Number(ev[0]?.whatsapp ?? 0),
        orders: Number(ord[0]?.orders ?? 0),
        revenue: Number(ord[0]?.revenue ?? 0),
      };
    };
    return { from: start, to: end, current: await period(start, end), previous: await period(prevStart, start) };
  }

  async listForStore(storeId: number) {
    const rows = await this.highlightRepository.find({
      where: { storeId },
      relations: { product: true },
      order: { startsAt: 'DESC' },
      take: 50,
    });
    const formats = new Map((await this.formats(true)).map((f) => [f.key, f.name]));
    return Promise.all(
      rows.map(async (h) => ({
        id: h.id,
        format: h.format,
        formatName: formats.get(h.format) ?? h.format,
        product: h.product ? { id: h.product.id, name: h.product.name } : null,
        categoryId: h.categoryId,
        keyword: h.keyword,
        durationDays: h.durationDays,
        startsAt: h.startsAt,
        endsAt: h.endsAt,
        price: Number(h.price),
        paidWith: h.paidWith,
        state: this.state(h),
        report: this.state(h) === 'active' || this.state(h) === 'finished' ? await this.report(h) : null,
      })),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Posições públicas (com rotação justa)                               */
  /* ------------------------------------------------------------------ */

  private shuffle<T>(arr: T[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  async placements(opts: { categoryId?: number | undefined; search?: string | undefined }) {
    const now = new Date();
    const active = await this.highlightRepository
      .createQueryBuilder('h')
      .innerJoin('h.store', 'store', 'store.is_active = true AND store.is_published = true')
      .addSelect(['store.id', 'store.name', 'store.slug', 'store.logoUrl', 'store.isVerified', 'store.averageRating', 'store.description'])
      .leftJoinAndSelect('h.product', 'product', 'product.is_active = true AND product.is_published = true AND product.hidden_by_plan = false')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category')
      .where(`h.status = 'booked' AND h.starts_at <= :now AND h.ends_at > :now`, { now })
      .getMany();

    const withProduct = (list: Highlight[]) =>
      list
        .filter((h) => h.product)
        .map((h) => ({ highlightId: h.id, product: { ...h.product!, store: h.store } }));

    const term = opts.search ? HighlightService.normalizeKeyword(opts.search) : '';
    return {
      carousel: this.shuffle(withProduct(active.filter((h) => h.format === 'home_carousel'))),
      categoryTop: opts.categoryId
        ? this.shuffle(withProduct(active.filter((h) => h.format === 'category_top' && h.categoryId === opts.categoryId)))
        : [],
      searchTop: term
        ? this.shuffle(withProduct(active.filter((h) => h.format === 'search_top' && h.keyword && (term.includes(h.keyword) || h.keyword.includes(term)))))
        : [],
      stores: this.shuffle(
        active.filter((h) => h.format === 'store_featured').map((h) => ({ highlightId: h.id, store: h.store })),
      ),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ciclo: relatórios no fim e oferta de reativação                     */
  /* ------------------------------------------------------------------ */

  async runLifecycle() {
    try {
      await this.sendFinishedReports();
      await this.grantReactivationOffers();
    } catch (err) {
      this.logger.error(`Falha no ciclo de destaques: ${(err as Error).message}`);
    }
  }

  private async ownerEmail(storeId: number) {
    const owner = await this.userRepository.findOne({ where: { storeId, rootAdmin: true } });
    return owner?.email ?? null;
  }

  private async sendFinishedReports() {
    const finished = await this.highlightRepository.find({
      where: { status: 'booked', endsAt: LessThan(new Date()), reportSentAt: IsNull() },
      relations: { product: true },
      take: 100,
    });
    for (const h of finished) {
      const r = await this.report(h);
      const to = await this.ownerEmail(h.storeId);
      if (r && to) {
        const linha = (rotulo: string, a: number, b: number) =>
          `<tr><td>${rotulo}</td><td style="text-align:right"><strong>${a}</strong></td><td style="text-align:right;color:#888">${b}</td></tr>`;
        await this.email
          .send({
            to,
            subject: 'Resultado do seu destaque — Kamba Shop',
            html: `<p>O destaque ${h.product ? `do produto <strong>${h.product.name}</strong>` : 'da sua loja'} terminou.</p>
              <table cellpadding="6"><tr><th></th><th>Com destaque</th><th>Período anterior</th></tr>
              ${linha('Visualizações', r.current.views, r.previous.views)}
              ${linha('Cliques no destaque', r.current.clicks, r.previous.clicks)}
              ${linha('Mensagens no WhatsApp', r.current.whatsapp, r.previous.whatsapp)}
              ${linha('Pedidos', r.current.orders, r.previous.orders)}</table>
              <p>Veja o relatório completo no painel da loja, separador «Destaques».</p>`,
          })
          .catch((err: Error) => this.logger.warn(`Relatório não enviado: ${err.message}`));
      }
      await this.highlightRepository.update(h.id, { reportSentAt: new Date() });
    }
  }

  /** Loja com produtos mas sem vendas há N dias recebe um destaque grátis (no máximo uma vez a cada 90 dias). */
  private async grantReactivationOffers() {
    const days = await this.settings.getNumber('reactivation_days_without_sales', 30);
    const hlDays = await this.settings.getNumber('reactivation_highlight_days', 3);
    if (days <= 0) return;
    const rows = (await this.storeRepository.manager.query(
      `SELECT s.id FROM tb_stores s
        WHERE s.deleted_at IS NULL AND s.is_active AND s.is_published
          AND s.created_at < NOW() - ($1 || ' days')::interval
          AND EXISTS (SELECT 1 FROM tb_products p WHERE p.store_id = s.id AND p.is_active AND p.is_published AND NOT p.hidden_by_plan AND p.deleted_at IS NULL)
          AND NOT EXISTS (SELECT 1 FROM tb_orders o WHERE o.store_id = s.id AND o.status <> 'cancelled' AND o.created_at > NOW() - ($1 || ' days')::interval)
          AND NOT EXISTS (SELECT 1 FROM tb_highlight_credits c WHERE c.store_id = s.id AND c.source = 'reactivation' AND c.created_at > NOW() - INTERVAL '90 days')`,
      [days],
    )) as { id: number }[];
    for (const { id } of rows) {
      await this.creditRepository.save(
        this.creditRepository.create({
          storeId: id,
          source: 'reactivation',
          format: 'category_top',
          durationDays: hlDays,
          expiresAt: new Date(Date.now() + 30 * DAY),
        }),
      );
      const to = await this.ownerEmail(id);
      if (to) {
        void this.email
          .send({
            to,
            subject: 'Oferta: um destaque grátis para a sua loja — Kamba Shop',
            html: `<p>Reparámos que a sua loja não tem vendas há ${days} dias.</p>
              <p>Oferecemos-lhe <strong>${hlDays} dias de destaque grátis</strong> no topo da categoria de um dos seus produtos.
              Ative-o no painel da loja, separador «Destaques» (válido 30 dias).</p>`,
          })
          .catch(() => undefined);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Admin                                                                */
  /* ------------------------------------------------------------------ */

  async adminList(state?: HighlightState) {
    const rows = await this.highlightRepository.find({
      relations: { product: true, store: true },
      order: { startsAt: 'DESC' },
      take: 300,
    });
    const formats = new Map((await this.formats(true)).map((f) => [f.key, f.name]));
    return rows
      .map((h) => ({
        id: h.id,
        store: { id: h.store.id, name: h.store.name },
        product: h.product ? { id: h.product.id, name: h.product.name } : null,
        format: h.format,
        formatName: formats.get(h.format) ?? h.format,
        categoryId: h.categoryId,
        keyword: h.keyword,
        durationDays: h.durationDays,
        startsAt: h.startsAt,
        endsAt: h.endsAt,
        price: Number(h.price),
        paidWith: h.paidWith,
        state: this.state(h),
      }))
      .filter((h) => !state || h.state === state);
  }

  async updateFormat(key: string, data: { name?: string; description?: string | null; slots?: number; prices?: Record<string, number>; isActive?: boolean }) {
    const f = await this.formatRepository.findOne({ where: { key: key as HighlightFormatKey } });
    if (!f) throw new NotFoundException('Formato não encontrado');
    if (data.prices) {
      for (const [d, p] of Object.entries(data.prices)) {
        if (!HIGHLIGHT_DURATIONS.includes(Number(d)) || !(Number(p) >= 0)) throw new BadRequestException('Preços inválidos (durações 3, 7 ou 15 dias)');
      }
    }
    Object.assign(f, data);
    return this.formatRepository.save(f);
  }

  listPackages(all = false) {
    return this.packageRepository.find({ where: all ? {} : { isActive: true }, order: { payAmount: 'ASC' } });
  }

  async savePackage(id: number | null, data: { payAmount: number; creditAmount: number; isActive?: boolean }) {
    if (!(data.payAmount > 0) || data.creditAmount < data.payAmount) {
      throw new BadRequestException('O saldo creditado tem de ser igual ou maior que o valor pago');
    }
    if (id) {
      await this.packageRepository.update(id, data);
      return this.packageRepository.findOne({ where: { id } });
    }
    return this.packageRepository.save(this.packageRepository.create(data));
  }

  async grantCredit(storeId: number, format: HighlightFormatKey, days: number) {
    await this.format(format);
    if (!HIGHLIGHT_DURATIONS.includes(days)) throw new BadRequestException('Duração inválida');
    return this.creditRepository.save(
      this.creditRepository.create({ storeId, source: 'admin', format, durationDays: days, expiresAt: new Date(Date.now() + 30 * DAY) }),
    );
  }

  /** Receita da carteira e taxa de recompra (KPI 3). */
  async metrics() {
    const m = this.highlightRepository.manager;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const spend = (await m.query(
      `SELECT COALESCE(SUM(-amount),0) AS v FROM tb_wallet_transactions WHERE type = 'spend' AND created_at >= $1`,
      [monthStart],
    )) as { v: string }[];
    const refunds = (await m.query(
      `SELECT COALESCE(SUM(amount),0) AS v FROM tb_wallet_transactions WHERE type = 'refund' AND created_at >= $1`,
      [monthStart],
    )) as { v: string }[];
    // Recompra: das lojas cujo primeiro destaque pago já terminou, quantas compraram outro depois
    const rep = (await m.query(
      `WITH firsts AS (
         SELECT store_id, MIN(created_at) AS first_at, MIN(ends_at) FILTER (WHERE TRUE) AS first_end
           FROM tb_highlights WHERE paid_with = 'wallet' AND status = 'booked' GROUP BY store_id)
       SELECT COUNT(*) FILTER (WHERE f.first_end < NOW()) AS base,
              COUNT(*) FILTER (WHERE f.first_end < NOW() AND EXISTS (
                SELECT 1 FROM tb_highlights h WHERE h.store_id = f.store_id AND h.paid_with = 'wallet' AND h.status = 'booked' AND h.created_at > f.first_at)) AS repeat
         FROM firsts f`,
    )) as { base: string; repeat: string }[];
    const active = await this.highlightRepository.count({ where: { status: 'booked', startsAt: LessThan(now), endsAt: MoreThan(now) } });
    const scheduled = await this.highlightRepository.count({ where: { status: 'booked', startsAt: MoreThan(now) } });
    const base = Number(rep[0]?.base ?? 0);
    const repeat = Number(rep[0]?.repeat ?? 0);
    return {
      walletSpendThisMonth: Number(spend[0]?.v ?? 0) - Number(refunds[0]?.v ?? 0),
      active,
      scheduled,
      repurchase: { base, repeat, rate: base > 0 ? Number(((repeat / base) * 100).toFixed(1)) : null },
    };
  }

  /** Destaques ocupados por formato (para mostrar escassez no admin). */
  async occupancy() {
    const now = new Date();
    const rows = (await this.highlightRepository.manager.query(
      `SELECT format, category_id AS "categoryId", keyword, COUNT(*) AS n FROM tb_highlights
        WHERE status = 'booked' AND starts_at <= $1 AND ends_at > $1 GROUP BY 1,2,3`,
      [now],
    )) as { format: string; categoryId: number | null; keyword: string | null; n: string }[];
    return rows.map((r) => ({ ...r, n: Number(r.n) }));
  }

  async adminCancel(id: number) {
    const h = await this.highlightRepository.findOne({ where: { id } });
    if (!h || h.status === 'cancelled') throw new NotFoundException('Destaque não encontrado');
    await this.highlightRepository.manager.transaction(async (m) => {
      await m.getRepository(Highlight).update(h.id, { status: 'cancelled' });
      if (h.paidWith === 'wallet' && Number(h.price) > 0) {
        // Reembolso proporcional aos dias que faltam
        const total = h.endsAt.getTime() - h.startsAt.getTime();
        const left = Math.max(0, h.endsAt.getTime() - Math.max(Date.now(), h.startsAt.getTime()));
        const refund = Math.round((Number(h.price) * left) / total);
        if (refund > 0) await this.wallet.move(m, h.storeId, refund, 'refund', { highlightId: h.id, notes: 'Destaque cancelado pela equipa Kamba Shop' });
      }
    });
    return { message: 'Destaque cancelado' };
  }

  storesWithIds(ids: number[]) {
    return ids.length ? this.storeRepository.find({ where: { id: In(ids) }, select: { id: true, name: true } }) : Promise.resolve([]);
  }
}
