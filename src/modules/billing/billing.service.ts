import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Plan } from '../shared/plan/entities/plan.entity';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../shared/auth/entities/user.entity';
import { StoreSubscription } from '../subscription/entities/subscription.entity';
import { SubscriptionInvoice, type BillingCycle, type PaymentMethod } from './entities/subscription-invoice.entity';
import { SettingService } from '../setting/setting.service';
import { WalletService } from './wallet.service';
import { WalletPackage } from './entities/highlight.entity';
import { EmailService } from '../shared/email/email.service';

const DAY = 24 * 60 * 60 * 1000;
export const CYCLE_DAYS: Record<BillingCycle, number> = { monthly: 30, quarterly: 90, annual: 365 };
export const CYCLE_LABEL: Record<BillingCycle, string> = { monthly: 'mensal', quarterly: 'trimestral', annual: 'anual' };
const PAID_SOURCES = ['payment', 'admin'];

export type PlanState = 'trial' | 'active' | 'grace' | 'free';

export interface EffectivePlan {
  plan: Plan;
  state: PlanState;
  subscription: StoreSubscription | null;
  /** Fim do período atual (teste ou pago). */
  endsAt: Date | null;
  /** Último dia da tolerância (apenas no estado grace). */
  graceEndsAt: Date | null;
  /** Período pago já agendado para depois do atual (renovação antecipada ou downgrade). */
  next: StoreSubscription | null;
}

@Injectable()
export class BillingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Plan) private readonly planRepository: Repository<Plan>,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(StoreSubscription) private readonly subscriptionRepository: Repository<StoreSubscription>,
    @InjectRepository(SubscriptionInvoice) private readonly invoiceRepository: Repository<SubscriptionInvoice>,
    private readonly settings: SettingService,
    private readonly email: EmailService,
    private readonly wallet: WalletService,
    @InjectRepository(WalletPackage) private readonly packageRepository: Repository<WalletPackage>,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Ciclo de vida: corre ao arrancar e de hora a hora                   */
  /* ------------------------------------------------------------------ */

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.runLifecycle(), 10_000);
    this.timer = setInterval(() => void this.runLifecycle(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runLifecycle() {
    try {
      const stores = await this.storeRepository.find({ select: { id: true } });
      for (const s of stores) await this.syncStore(s.id);
    } catch (err) {
      this.logger.error(`Falha no ciclo de subscrições: ${(err as Error).message}`);
    }
  }

  /**
   * Aplica as consequências do plano efetivo: oculta/mostra produtos acima do limite,
   * marca períodos expirados e retira o estatuto Fundador a quem deixou de pagar.
   */
  async syncStore(storeId: number) {
    const eff = await this.getEffectivePlan(storeId);
    const graceDays = await this.settings.getNumber('grace_days', 5);

    await this.subscriptionRepository
      .createQueryBuilder()
      .update(StoreSubscription)
      .set({ status: 'expired' })
      .where('store_id = :storeId AND status IN (:...st)', { storeId, st: ['active', 'trialing'] })
      .andWhere(`end_date IS NOT NULL AND end_date + (:grace || ' days')::interval < NOW()`, { grace: graceDays })
      .execute();

    await this.applyProductLimit(storeId, eff.plan.limitProducts);

    if (eff.state === 'free') {
      await this.storeRepository.update({ id: storeId, isFounder: true }, { isFounder: false });
    }
    return eff;
  }

  private async applyProductLimit(storeId: number, limit: number | null) {
    if (limit === null) {
      await this.productRepository.update({ storeId, hiddenByPlan: true }, { hiddenByPlan: false });
      return;
    }
    // Mantém visíveis os produtos mais valiosos: destacados, mais vendidos e depois os mais antigos
    const products = await this.productRepository.find({
      where: { storeId },
      select: { id: true, hiddenByPlan: true },
      order: { isFeatured: 'DESC', totalSales: 'DESC', createdAt: 'ASC' },
    });
    const show = products.slice(0, limit).filter((p) => p.hiddenByPlan).map((p) => p.id);
    const hide = products.slice(limit).filter((p) => !p.hiddenByPlan).map((p) => p.id);
    if (show.length) await this.productRepository.update({ id: In(show) }, { hiddenByPlan: false });
    if (hide.length) await this.productRepository.update({ id: In(hide) }, { hiddenByPlan: true });
  }

  /* ------------------------------------------------------------------ */
  /* Plano efetivo                                                       */
  /* ------------------------------------------------------------------ */

  async freePlan(): Promise<Plan> {
    const plan =
      (await this.planRepository.findOne({ where: { slug: 'gratis' } })) ??
      (await this.planRepository.findOne({ where: { price: 0, isActive: true }, order: { position: 'ASC' } }));
    if (!plan) throw new NotFoundException('Plano Grátis não configurado');
    return plan;
  }

  async getEffectivePlan(storeId: number): Promise<EffectivePlan> {
    const now = new Date();
    const graceDays = await this.settings.getNumber('grace_days', 5);
    const subs = await this.subscriptionRepository.find({
      where: { storeId, status: In(['active', 'trialing', 'expired']) },
      relations: { plan: true },
      order: { endDate: 'DESC' },
    });
    // O plano Grátis é o estado base: ignoramos registos antigos do plano gratuito
    const relevant = subs.filter((s) => s.plan && (Number(s.plan.price) > 0 || s.source === 'trial'));
    const covers = (s: StoreSubscription) => s.startDate <= now && (!s.endDate || s.endDate >= now);

    const current = relevant.filter((s) => s.status !== 'expired' && covers(s))
      // pagos têm prioridade sobre o teste
      .sort((a, b) => Number(b.source !== 'trial') - Number(a.source !== 'trial'))[0];
    const next = relevant
      .filter((s) => s.status === 'active' && s.startDate > now && PAID_SOURCES.includes(s.source))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? null;

    if (current) {
      return {
        plan: current.plan,
        state: current.source === 'trial' ? 'trial' : 'active',
        subscription: current,
        endsAt: current.endDate,
        graceEndsAt: null,
        next,
      };
    }

    const lastPaid = relevant.find((s) => PAID_SOURCES.includes(s.source) && s.endDate && s.endDate < now);
    if (lastPaid?.endDate && lastPaid.endDate.getTime() + graceDays * DAY >= now.getTime()) {
      return {
        plan: lastPaid.plan,
        state: 'grace',
        subscription: lastPaid,
        endsAt: lastPaid.endDate,
        graceEndsAt: new Date(lastPaid.endDate.getTime() + graceDays * DAY),
        next,
      };
    }

    return { plan: await this.freePlan(), state: 'free', subscription: null, endsAt: null, graceEndsAt: null, next };
  }

  /** Resumo usado pelo painel do vendedor: plano, estado, uso e limites. */
  async overview(storeId: number) {
    const eff = await this.getEffectivePlan(storeId);
    const store = await this.storeRepository.findOne({ where: { id: storeId } });
    const [products, visibleProducts, users, pending, founder] = await Promise.all([
      this.productRepository.count({ where: { storeId } }),
      this.productRepository.count({ where: { storeId, hiddenByPlan: false } }),
      this.userRepository.count({ where: { storeId } }),
      this.invoiceRepository
        .findOne({ where: { storeId, kind: 'subscription' }, relations: { plan: true }, order: { createdAt: 'DESC' } })
        .then((last) => (last && ['pending', 'awaiting_validation', 'rejected'].includes(last.status) ? last : null)),
      this.founderInfo(),
    ]);
    const hadTrial = await this.subscriptionRepository.exists({ where: { storeId, source: 'trial' } });
    const { plan } = eff;
    return {
      plan: this.publicPlan(plan),
      state: eff.state,
      endsAt: eff.endsAt,
      graceEndsAt: eff.graceEndsAt,
      daysLeft: eff.endsAt ? Math.max(0, Math.ceil((eff.endsAt.getTime() - Date.now()) / DAY)) : null,
      cycle: eff.subscription?.cycle ?? null,
      next: eff.next ? { plan: this.publicPlan(eff.next.plan), startsAt: eff.next.startDate, endsAt: eff.next.endDate } : null,
      isFounder: !!store?.isFounder,
      founder,
      hadTrial,
      pendingInvoice: pending ? { ...pending, reference: this.invoiceReference(pending.id) } : null,
      usage: {
        products: { used: products, visible: visibleProducts, hidden: products - visibleProducts, limit: plan.limitProducts },
        users: { used: users, limit: plan.limitUsers },
        imagesPerProduct: { limit: plan.limitImagesPerProduct },
        highlightsPerMonth: { limit: plan.limitHighlightsPerMonth },
      },
    };
  }

  publicPlan(plan: Plan) {
    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      price: Number(plan.price),
      priceQuarterly: plan.priceQuarterly != null ? Number(plan.priceQuarterly) : null,
      priceAnnual: plan.priceAnnual != null ? Number(plan.priceAnnual) : null,
      limitProducts: plan.limitProducts,
      limitImagesPerProduct: plan.limitImagesPerProduct,
      limitUsers: plan.limitUsers,
      limitHighlightsPerMonth: plan.limitHighlightsPerMonth,
      allowsChatbot: plan.allowsChatbot,
      allowsCoupons: plan.allowsCoupons,
      allowsRemoveBranding: plan.allowsRemoveBranding,
      allowsCustomDomain: plan.allowsCustomDomain,
      statisticsLevel: plan.statisticsLevel,
      supportLevel: plan.supportLevel,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Limites dos planos                                                  */
  /* ------------------------------------------------------------------ */

  private async nextPlanFor(current: Plan, allows: (p: Plan) => boolean) {
    const plans = await this.planRepository.find({ where: { isActive: true }, order: { position: 'ASC' } });
    return plans.find((p) => p.position > current.position && allows(p)) ?? null;
  }

  private limitError(message: string, upgrade: Plan | null) {
    return new ForbiddenException({
      statusCode: 403,
      code: 'PLAN_LIMIT',
      message,
      upgradePlan: upgrade ? { id: upgrade.id, slug: upgrade.slug, name: upgrade.name } : null,
    });
  }

  private fmtLimit(n: number | null) {
    return n === null ? 'ilimitados' : `até ${n}`;
  }

  async assertCanCreateProduct(storeId: number) {
    const { plan } = await this.getEffectivePlan(storeId);
    if (plan.limitProducts === null) return;
    const count = await this.productRepository.count({ where: { storeId } });
    if (count >= plan.limitProducts) {
      const up = await this.nextPlanFor(plan, (p) => p.limitProducts === null || p.limitProducts > plan.limitProducts!);
      throw this.limitError(
        `Chegaste aos ${plan.limitProducts} produtos do plano ${plan.name}.` +
          (up ? ` Com o plano ${up.name} podes ter ${this.fmtLimit(up.limitProducts)} produtos.` : ''),
        up,
      );
    }
  }

  async assertCanAddImage(storeId: number, currentImages: number) {
    const { plan } = await this.getEffectivePlan(storeId);
    const limit = plan.limitImagesPerProduct;
    if (limit === null || currentImages < limit) return;
    const up = await this.nextPlanFor(plan, (p) => p.limitImagesPerProduct === null || p.limitImagesPerProduct > limit);
    throw this.limitError(
      `O plano ${plan.name} permite ${limit} fotos por produto.` + (up ? ` No plano ${up.name} podes usar ${up.limitImagesPerProduct}.` : ''),
      up,
    );
  }

  async assertCanAddUser(storeId: number) {
    const { plan } = await this.getEffectivePlan(storeId);
    if (plan.limitUsers === null) return;
    const count = await this.userRepository.count({ where: { storeId } });
    if (count >= plan.limitUsers) {
      const up = await this.nextPlanFor(plan, (p) => p.limitUsers === null || p.limitUsers > plan.limitUsers!);
      throw this.limitError(
        `O plano ${plan.name} inclui ${plan.limitUsers} membro(s) da equipa.` + (up ? ` No plano ${up.name} podes ter ${up.limitUsers}.` : ''),
        up,
      );
    }
  }

  async assertFeature(storeId: number, feature: 'allowsChatbot' | 'allowsCoupons' | 'allowsRemoveBranding' | 'allowsCustomDomain', label: string) {
    const { plan } = await this.getEffectivePlan(storeId);
    if (plan[feature]) return;
    const up = await this.nextPlanFor(plan, (p) => p[feature]);
    throw this.limitError(`${label} não faz parte do plano ${plan.name}.` + (up ? ` Disponível a partir do plano ${up.name}.` : ''), up);
  }

  async assertStatisticsLevel(storeId: number, min: Plan['statisticsLevel'], label: string) {
    const order = ['basic', 'sales', 'advanced', 'advanced_export'];
    const { plan } = await this.getEffectivePlan(storeId);
    if (order.indexOf(plan.statisticsLevel) >= order.indexOf(min)) return;
    const up = await this.nextPlanFor(plan, (p) => order.indexOf(p.statisticsLevel) >= order.indexOf(min));
    throw this.limitError(`${label} não faz parte do plano ${plan.name}.` + (up ? ` Disponível a partir do plano ${up.name}.` : ''), up);
  }

  /** Funcionalidades ativas para a loja (usado para filtrar a vista pública). */
  async features(storeId: number) {
    const { plan } = await this.getEffectivePlan(storeId);
    return this.publicPlan(plan);
  }

  /* ------------------------------------------------------------------ */
  /* Teste de 14 dias                                                     */
  /* ------------------------------------------------------------------ */

  async startTrial(storeId: number) {
    const days = await this.settings.getNumber('trial_days', 14);
    const pro = await this.planRepository.findOne({ where: { slug: 'pro', isActive: true } });
    if (!pro || days <= 0) return null;
    const now = new Date();
    return this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        storeId,
        planId: pro.id,
        startDate: now,
        endDate: new Date(now.getTime() + days * DAY),
        status: 'trialing',
        paymentStatus: 'paid',
        amount: 0,
        durationDays: days,
        cycle: 'trial',
        source: 'trial',
        notes: `Teste gratuito de ${days} dias do plano Pro`,
      }),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Preços, Fundador e faturas                                           */
  /* ------------------------------------------------------------------ */

  async founderInfo() {
    const [slots, percent, used] = await Promise.all([
      this.settings.getNumber('founder_slots', 50),
      this.settings.getNumber('founder_discount_percent', 50),
      this.storeRepository.count({ where: { founderSince: Not(IsNull()) } }),
    ]);
    return { slots, used, remaining: Math.max(0, slots - used), percent };
  }

  priceFor(plan: Plan, cycle: BillingCycle): number {
    const monthly = Number(plan.price);
    if (cycle === 'quarterly') return plan.priceQuarterly != null ? Number(plan.priceQuarterly) : Math.round(monthly * 3 * 0.9);
    if (cycle === 'annual') return plan.priceAnnual != null ? Number(plan.priceAnnual) : monthly * 10;
    return monthly;
  }

  async quote(storeId: number, planId: number, cycle: BillingCycle) {
    const plan = await this.planRepository.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    if (Number(plan.price) <= 0) throw new BadRequestException('O plano Grátis não precisa de pagamento');
    if (!CYCLE_DAYS[cycle]) throw new BadRequestException('Ciclo de faturação inválido');

    const store = await this.storeRepository.findOne({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Loja não encontrada');
    const founder = await this.founderInfo();
    const everPaid = await this.invoiceRepository.exists({ where: { storeId, status: 'paid' } });
    // Fundador: quem já é fundador mantém; os primeiros vendedores pagantes entram enquanto houver vagas
    const founderEligible = store.isFounder || (!everPaid && founder.remaining > 0);

    const baseAmount = this.priceFor(plan, cycle);
    const discountPercent = founderEligible ? founder.percent : 0;
    const amount = Math.round(baseAmount * (1 - discountPercent / 100));
    return {
      plan: this.publicPlan(plan),
      cycle,
      periodDays: CYCLE_DAYS[cycle],
      baseAmount,
      discountPercent,
      discountReason: founderEligible ? 'founder' : null,
      amount,
    };
  }

  async paymentInstructions() {
    const get = async (k: string) => {
      const all = await this.settings.findPublic();
      return String(all[k] ?? '');
    };
    return {
      multicaixaExpress: await get('billing_multicaixa_express'),
      referenceEntity: await get('billing_reference_entity'),
      bankName: await get('billing_bank_name'),
      iban: await get('billing_iban'),
      accountHolder: await get('billing_account_holder'),
    };
  }

  /** Referência que o vendedor indica no pagamento (descritivo da transferência / referência). */
  invoiceReference(id: number) {
    return `KS${String(id).padStart(7, '0')}`;
  }

  /** Carregamento da carteira de destaques (pacote com bónus), pago e validado como uma fatura. */
  async createTopupInvoice(storeId: number, userId: number, packageId: number, method: PaymentMethod) {
    const pack = await this.packageRepository.findOne({ where: { id: packageId, isActive: true } });
    if (!pack) throw new NotFoundException('Pacote não encontrado');
    const open = await this.invoiceRepository.findOne({ where: { storeId, kind: 'wallet_topup', status: In(['pending', 'awaiting_validation']) } });
    if (open?.status === 'awaiting_validation') {
      throw new BadRequestException('Já tem um carregamento em validação. Aguarde a confirmação.');
    }
    if (open) {
      open.status = 'cancelled';
      await this.invoiceRepository.save(open);
    }
    const invoice = await this.invoiceRepository.save(
      this.invoiceRepository.create({
        storeId,
        kind: 'wallet_topup',
        planId: null,
        cycle: null,
        periodDays: null,
        baseAmount: Number(pack.payAmount),
        discountPercent: 0,
        amount: Number(pack.payAmount),
        creditAmount: Number(pack.creditAmount),
        status: 'pending',
        paymentMethod: method,
        createdBy: userId,
      }),
    );
    return this.findInvoice(invoice.id, storeId);
  }

  listPackages() {
    return this.packageRepository.find({ where: { isActive: true }, order: { payAmount: 'ASC' } });
  }

  async createInvoice(storeId: number, userId: number, planId: number, cycle: BillingCycle, method: PaymentMethod) {
    const open = await this.invoiceRepository.findOne({ where: { storeId, kind: 'subscription', status: In(['pending', 'awaiting_validation']) } });
    if (open?.status === 'awaiting_validation') {
      throw new BadRequestException('Já tem um pagamento em validação. Aguarde a confirmação da equipa Kamba Shop.');
    }
    if (open) {
      open.status = 'cancelled';
      await this.invoiceRepository.save(open);
    }
    const q = await this.quote(storeId, planId, cycle);
    const invoice = await this.invoiceRepository.save(
      this.invoiceRepository.create({
        storeId,
        planId,
        cycle,
        periodDays: q.periodDays,
        baseAmount: q.baseAmount,
        discountPercent: q.discountPercent,
        discountReason: q.discountReason,
        amount: q.amount,
        status: 'pending',
        paymentMethod: method,
        createdBy: userId,
      }),
    );
    return this.findInvoice(invoice.id, storeId);
  }

  async findInvoice(id: number, storeId?: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: storeId ? { id, storeId } : { id },
      relations: { plan: true, store: true },
    });
    if (!invoice) throw new NotFoundException(`Fatura #${id} não encontrada`);
    return { ...invoice, reference: this.invoiceReference(invoice.id) };
  }

  listInvoices(storeId: number) {
    return this.invoiceRepository
      .find({ where: { storeId }, relations: { plan: true }, order: { createdAt: 'DESC' }, take: 50 })
      .then((rows) => rows.map((r) => ({ ...r, reference: this.invoiceReference(r.id) })));
  }

  async submitProof(id: number, storeId: number, data: { paymentReference?: string; proofUrl?: string; paymentMethod?: PaymentMethod }) {
    const invoice = await this.invoiceRepository.findOne({ where: { id, storeId } });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (!['pending', 'rejected'].includes(invoice.status)) {
      throw new BadRequestException('Esta fatura já não aceita comprovativos');
    }
    if (!data.proofUrl && !data.paymentReference) {
      throw new BadRequestException('Envie o comprovativo ou indique a referência/ID da transação');
    }
    invoice.proofUrl = data.proofUrl ?? invoice.proofUrl;
    invoice.paymentReference = data.paymentReference?.trim() || invoice.paymentReference;
    if (data.paymentMethod) invoice.paymentMethod = data.paymentMethod;
    invoice.status = 'awaiting_validation';
    invoice.proofSubmittedAt = new Date();
    invoice.rejectionReason = null;
    await this.invoiceRepository.save(invoice);
    return this.findInvoice(id, storeId);
  }

  async cancelInvoice(id: number, storeId: number) {
    const invoice = await this.invoiceRepository.findOne({ where: { id, storeId } });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (!['pending', 'rejected'].includes(invoice.status)) throw new BadRequestException('Esta fatura não pode ser cancelada');
    invoice.status = 'cancelled';
    await this.invoiceRepository.save(invoice);
    return { message: 'Fatura cancelada' };
  }

  /* ------------------------------------------------------------------ */
  /* Validação no admin                                                  */
  /* ------------------------------------------------------------------ */

  async approveInvoice(id: number, adminId: number) {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: { plan: true, store: true } });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (!['pending', 'awaiting_validation', 'rejected'].includes(invoice.status)) {
      throw new BadRequestException('Esta fatura já foi processada');
    }

    if (invoice.kind === 'wallet_topup') {
      await this.wallet.moveNow(invoice.storeId, Number(invoice.creditAmount ?? invoice.amount), 'topup', {
        invoiceId: invoice.id,
        notes: `Carregamento ${this.invoiceReference(invoice.id)}`,
      });
      invoice.status = 'paid';
      invoice.reviewedBy = adminId;
      invoice.reviewedAt = new Date();
      invoice.rejectionReason = null;
      await this.invoiceRepository.save(invoice);
      void this.notify(invoice.storeId, 'Saldo de destaques carregado — Kamba Shop', `
        <p>O pagamento <strong>${this.invoiceReference(invoice.id)}</strong> foi confirmado.</p>
        <p>Foram adicionados <strong>${Number(invoice.creditAmount ?? invoice.amount).toLocaleString('pt-PT')} Kz</strong> à carteira de destaques da sua loja.</p>`);
      return this.findInvoice(id);
    }
    if (!invoice.plan || !invoice.periodDays || !invoice.cycle) throw new BadRequestException('Fatura sem plano');

    const sub = await this.activatePeriod(invoice.storeId, invoice.plan, invoice.periodDays, {
      source: 'payment',
      cycle: invoice.cycle,
      amount: Number(invoice.amount),
      invoiceId: invoice.id,
      paymentRef: invoice.paymentReference ?? this.invoiceReference(invoice.id),
    });

    invoice.status = 'paid';
    invoice.reviewedBy = adminId;
    invoice.reviewedAt = new Date();
    invoice.rejectionReason = null;
    await this.invoiceRepository.save(invoice);

    if (invoice.discountReason === 'founder' && !invoice.store.isFounder) {
      await this.storeRepository.update(invoice.storeId, { isFounder: true, founderSince: invoice.store.founderSince ?? new Date() });
    }
    await this.syncStore(invoice.storeId);
    void this.notify(invoice.storeId, 'Pagamento confirmado — Kamba Shop', `
      <p>O pagamento da fatura <strong>${this.invoiceReference(invoice.id)}</strong> foi confirmado.</p>
      <p>O plano <strong>${invoice.plan.name}</strong> (${CYCLE_LABEL[invoice.cycle!]}) está ativo até <strong>${sub.endDate?.toLocaleDateString('pt-AO')}</strong>.</p>`);
    return this.findInvoice(id);
  }

  async rejectInvoice(id: number, adminId: number, reason: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: { plan: true } });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (!['pending', 'awaiting_validation'].includes(invoice.status)) throw new BadRequestException('Esta fatura já foi processada');
    if (!reason?.trim()) throw new BadRequestException('Indique o motivo da rejeição');
    invoice.status = 'rejected';
    invoice.rejectionReason = reason.trim();
    invoice.reviewedBy = adminId;
    invoice.reviewedAt = new Date();
    await this.invoiceRepository.save(invoice);
    void this.notify(invoice.storeId, 'Pagamento não confirmado — Kamba Shop', `
      <p>Não conseguimos confirmar o pagamento da fatura <strong>${this.invoiceReference(invoice.id)}</strong>.</p>
      <p>Motivo: ${reason.trim()}</p><p>Pode enviar um novo comprovativo no painel da sua loja, separador «Plano».</p>`);
    return this.findInvoice(id);
  }

  /** Atribuição manual pelo admin (oferta, compensação, parceria). */
  async grantPlan(storeId: number, planId: number, days: number, notes: string | undefined) {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    if (days < 1 || days > 3650) throw new BadRequestException('Duração inválida');
    const sub = await this.activatePeriod(storeId, plan, days, { source: 'admin', cycle: null, amount: 0, invoiceId: null, paymentRef: null, notes: notes ?? null });
    await this.syncStore(storeId);
    return sub;
  }

  /**
   * Cria o período pago:
   * - mesmo plano ou plano inferior → começa quando o período atual acabar (renovação / downgrade agendado);
   * - plano superior ou saída do teste → começa já; os dias pagos restantes são convertidos pelo valor diário.
   */
  private async activatePeriod(
    storeId: number,
    plan: Plan,
    days: number,
    opts: { source: string; cycle: string | null; amount: number; invoiceId: number | null; paymentRef: string | null; notes?: string | null },
  ) {
    const now = new Date();
    const eff = await this.getEffectivePlan(storeId);
    const current = eff.state === 'active' ? eff.subscription : null;
    let start = now;
    let bonusDays = 0;

    if (current?.endDate) {
      const samePlan = current.planId === plan.id;
      const lowerPlan = Number(plan.price) < Number(current.plan.price);
      if (samePlan || lowerPlan) {
        // Encadeia depois do último período já pago (inclui renovações antecipadas)
        const lastEnd = eff.next?.endDate && eff.next.endDate > current.endDate ? eff.next.endDate : current.endDate;
        start = lastEnd;
      } else {
        const remainingDays = (current.endDate.getTime() - now.getTime()) / DAY;
        const oldDaily = Number(current.amount ?? 0) / Math.max(current.durationDays ?? 30, 1);
        const newDaily = Number(plan.price) / 30;
        bonusDays = newDaily > 0 ? Math.floor((remainingDays * oldDaily) / newDaily) : 0;
        await this.subscriptionRepository.update(current.id, { endDate: now, status: 'expired', notes: `Substituído pelo plano ${plan.name}` });
      }
    }
    if (eff.state === 'trial' && eff.subscription) {
      await this.subscriptionRepository.update(eff.subscription.id, { endDate: now, status: 'expired' });
    }

    const totalDays = days + bonusDays;
    return this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        storeId,
        planId: plan.id,
        plan,
        startDate: start,
        endDate: new Date(start.getTime() + totalDays * DAY),
        status: 'active',
        paymentStatus: 'paid',
        paidAt: now,
        amount: opts.amount,
        durationDays: totalDays,
        cycle: opts.cycle,
        source: opts.source,
        invoiceId: opts.invoiceId,
        paymentRef: opts.paymentRef,
        notes: opts.notes ?? (bonusDays ? `Inclui ${bonusDays} dia(s) convertidos do plano anterior` : null),
      }),
    );
  }

  private async notify(storeId: number, subject: string, html: string) {
    try {
      const owner = await this.userRepository.findOne({ where: { storeId, rootAdmin: true } });
      if (owner?.email) await this.email.send({ to: owner.email, subject, html });
    } catch (err) {
      this.logger.warn(`Email de faturação não enviado: ${(err as Error).message}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Admin: listas e métricas                                            */
  /* ------------------------------------------------------------------ */

  async adminInvoices(page = 1, limit = 50, status?: string, search?: string) {
    const qb = this.invoiceRepository
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.plan', 'plan')
      .leftJoin('i.store', 'store')
      .addSelect(['store.id', 'store.name', 'store.slug', 'store.whatsapp', 'store.isFounder'])
      .addSelect(`CASE WHEN i.status = 'awaiting_validation' THEN 0 WHEN i.status = 'pending' THEN 1 ELSE 2 END`, 'i_priority')
      .orderBy('i_priority', 'ASC')
      .addOrderBy('i.createdAt', 'DESC');
    if (status) qb.andWhere('i.status = :status', { status });
    if (search) {
      const digits = search.replace(/\D/g, '');
      qb.andWhere(`(store.name ILIKE :s OR i.payment_reference ILIKE :s${digits ? ' OR i.id = :id' : ''})`, { s: `%${search}%`, id: Number(digits) || 0 });
    }
    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const counts = await this.invoiceRepository
      .createQueryBuilder('i')
      .select('i.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(i.amount), 0)', 'amount')
      .groupBy('i.status')
      .getRawMany<{ status: string; count: string; amount: string }>();
    return {
      data: rows.map((r) => ({ ...r, reference: this.invoiceReference(r.id) })),
      counts: Object.fromEntries(counts.map((c) => [c.status, { count: Number(c.count), amount: Number(c.amount) }])),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Estado de subscrição de todas as lojas (lista do admin). */
  async adminSubscriptions() {
    const stores = await this.storeRepository.find({
      select: { id: true, name: true, slug: true, isFounder: true, isActive: true, createdAt: true },
      order: { createdAt: 'DESC' },
    });
    const rows: {
      store: Store; plan: { id: number; name: string; slug: string | null }; state: PlanState; cycle: string | null;
      source: string | null; endsAt: Date | null; graceEndsAt: Date | null; products: number; hiddenProducts: number;
    }[] = [];
    for (const s of stores) {
      const eff = await this.getEffectivePlan(s.id);
      const products = await this.productRepository.count({ where: { storeId: s.id } });
      const hidden = await this.productRepository.count({ where: { storeId: s.id, hiddenByPlan: true } });
      rows.push({
        store: s,
        plan: { id: eff.plan.id, name: eff.plan.name, slug: eff.plan.slug },
        state: eff.state,
        cycle: eff.subscription?.cycle ?? null,
        source: eff.subscription?.source ?? null,
        endsAt: eff.endsAt,
        graceEndsAt: eff.graceEndsAt,
        products,
        hiddenProducts: hidden,
      });
    }
    return rows;
  }

  /** KPI 3 (calculado aqui para evitar dependência circular com HighlightService). */
  private async highlightRepurchase() {
    const rows = (await this.subscriptionRepository.manager.query(
      `WITH firsts AS (SELECT store_id, MIN(created_at) AS first_at, MIN(ends_at) AS first_end
                         FROM tb_highlights WHERE paid_with = 'wallet' AND status = 'booked' GROUP BY store_id)
       SELECT COUNT(*) FILTER (WHERE f.first_end < NOW()) AS base,
              COUNT(*) FILTER (WHERE f.first_end < NOW() AND EXISTS (SELECT 1 FROM tb_highlights h
                WHERE h.store_id = f.store_id AND h.paid_with = 'wallet' AND h.status = 'booked' AND h.created_at > f.first_at)) AS repeat
         FROM firsts f`,
    )) as { base: string; repeat: string }[];
    const base = Number(rows[0]?.base ?? 0);
    const repeat = Number(rows[0]?.repeat ?? 0);
    return { base, repeat, rate: base > 0 ? Number(((repeat / base) * 100).toFixed(1)) : null };
  }

  async metrics() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const graceDays = await this.settings.getNumber('grace_days', 5);
    const m = this.subscriptionRepository.manager;

    const revenue = async (from: Date, to?: Date) => {
      const r = (await m.query(
        `SELECT COALESCE(SUM(amount),0) AS v, COUNT(*) AS n FROM tb_subscription_invoices
          WHERE status = 'paid' AND reviewed_at >= $1 ${to ? 'AND reviewed_at < $2' : ''}`,
        to ? [from, to] : [from],
      )) as { v: string; n: string }[];
      return { amount: Number(r[0]?.v ?? 0), count: Number(r[0]?.n ?? 0) };
    };

    // Lojas com período pago a cobrir o instante T (incluindo a tolerância)
    const coveredAt = async (t: Date) =>
      (
        (await m.query(
          `SELECT DISTINCT s.store_id FROM tb_store_subscriptions s JOIN tb_plans p ON p.id = s.plan_id
            WHERE p.price > 0 AND s.source IN ('payment','admin') AND s.status IN ('active','expired')
              AND s.start_date <= $1 AND s.end_date + ($2 || ' days')::interval >= $1`,
          [t, graceDays],
        )) as { store_id: number }[]
      ).map((r) => Number(r.store_id));

    const [thisMonth, lastMonth, pending, subs, founder] = await Promise.all([
      revenue(monthStart),
      revenue(prevMonthStart, monthStart),
      m.query(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS v FROM tb_subscription_invoices WHERE status = 'awaiting_validation'`) as Promise<{ n: string; v: string }[]>,
      this.adminSubscriptions(),
      this.founderInfo(),
    ]);

    // MRR: valor mensal equivalente dos períodos pagos em curso
    const mrrRows = (await m.query(
      `SELECT COALESCE(SUM(s.amount / GREATEST(s.duration_days,1) * 30),0) AS mrr FROM tb_store_subscriptions s
        WHERE s.source = 'payment' AND s.status = 'active' AND s.start_date <= NOW() AND s.end_date >= NOW()`,
    )) as { mrr: string }[];

    const byState: Record<string, number> = { trial: 0, active: 0, grace: 0, free: 0 };
    const byPlan: Record<string, number> = {};
    for (const s of subs) {
      byState[s.state] = (byState[s.state] ?? 0) + 1;
      if (s.state === 'active' || s.state === 'grace') byPlan[s.plan.name] = (byPlan[s.plan.name] ?? 0) + 1;
    }

    // KPI 1 — conversão grátis → pago (lojas que já pagaram pelo menos uma vez)
    const conv = (await m.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM tb_subscription_invoices i WHERE i.store_id = s.id AND i.status = 'paid')) AS paid,
              COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '90 days') AS total90,
              COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '90 days'
                AND EXISTS (SELECT 1 FROM tb_subscription_invoices i WHERE i.store_id = s.id AND i.status = 'paid')) AS paid90
         FROM tb_stores s WHERE s.deleted_at IS NULL`,
    )) as { total: string; paid: string; total90: string; paid90: string }[];
    const pct = (a: number, b: number) => (b > 0 ? Number(((a / b) * 100).toFixed(1)) : null);

    // KPI 2 — cancelamentos mensais: pagantes no início do mês que perderam o plano até ao início do mês seguinte
    const churnFor = async (from: Date, to: Date) => {
      const start = await coveredAt(from);
      if (!start.length) return { base: 0, churned: 0, rate: null as number | null };
      const endSet = new Set(await coveredAt(to > now ? now : to));
      const churned = start.filter((id) => !endSet.has(id)).length;
      return { base: start.length, churned, rate: pct(churned, start.length) };
    };

    return {
      revenue: { thisMonth, lastMonth },
      mrr: Math.round(Number(mrrRows[0]?.mrr ?? 0)),
      pendingValidation: { count: Number(pending[0]?.n ?? 0), amount: Number(pending[0]?.v ?? 0) },
      stores: { byState, byPlan, total: subs.length },
      founder,
      kpis: {
        conversion: {
          overall: pct(Number(conv[0]?.paid ?? 0), Number(conv[0]?.total ?? 0)),
          last90Days: pct(Number(conv[0]?.paid90 ?? 0), Number(conv[0]?.total90 ?? 0)),
          target: 5,
        },
        churn: {
          lastMonth: await churnFor(prevMonthStart, monthStart),
          thisMonth: await churnFor(monthStart, now),
          target: 8,
        },
        highlightRepurchase: { ...(await this.highlightRepurchase()), target: 30 },
      },
    };
  }
}
