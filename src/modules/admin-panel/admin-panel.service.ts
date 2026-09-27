import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderStatusHistory } from '../order/entities/order-status-history.entity';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/entities/product.entity';
import { Client } from '../client/entities/client.entity';
import { User } from '../shared/auth/entities/user.entity';
import { Dispute } from '../dispute/entities/dispute.entity';
import { Review } from '../review/entities/review.entity';
import { Report } from '../report/entities/report.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { UpdateOrderStatusDto } from '../order/dto/update-order-status.dto';
import { paginate } from '../../common/require-user-type';
import { BillingService } from '../billing/billing.service';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

@Injectable()
export class AdminPanelService {
  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory) private readonly historyRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Dispute) private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Report) private readonly reportRepository: Repository<Report>,
    @InjectRepository(Ticket) private readonly ticketRepository: Repository<Ticket>,
    private readonly billing: BillingService,
  ) {}

  /* ------------------------------ DASHBOARD ------------------------------ */

  async dashboard() {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const periodTotals = async (from: Date, to?: Date) => {
      const qb = this.orderRepository
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total), 0)', 'volume')
        .addSelect('COUNT(*)', 'orders')
        .where('o.status != :cancelled', { cancelled: 'cancelled' })
        .andWhere('o.created_at >= :from', { from });
      if (to) qb.andWhere('o.created_at < :to', { to });
      const r = await qb.getRawOne<{ volume: string; orders: string }>();
      return { volume: Number(r?.volume ?? 0), orders: Number(r?.orders ?? 0) };
    };

    const [current, previous, today] = await Promise.all([
      periodTotals(startMonth),
      periodTotals(startPrevMonth, startMonth),
      periodTotals(startToday),
    ]);

    const variation = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Number((((a - b) / b) * 100).toFixed(1)));

    const monthlyRows = await this.orderRepository
      .createQueryBuilder('o')
      .select("TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(o.total), 0)', 'sales')
      .addSelect('COUNT(*)', 'orders')
      .where('o.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('o.created_at >= :from', { from: startSixMonths })
      .groupBy('month')
      .getRawMany<{ month: string; sales: string; orders: string }>();
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = monthlyRows.find((r) => r.month === key);
      return { month: MONTHS_PT[d.getMonth()], key, sales: Number(row?.sales ?? 0), orders: Number(row?.orders ?? 0) };
    });

    // Receita por categoria: categoria do produto vendido; sem itens, usa a categoria da loja
    const byCategory = await this.orderRepository.query(
      `SELECT COALESCE(pc.name, sc.name, 'Sem categoria') AS name,
              SUM(COALESCE(i.subtotal, o.total)) AS value
         FROM tb_orders o
         JOIN tb_stores s ON s.id = o.store_id
         LEFT JOIN tb_categories sc ON sc.id = s.category_id
         LEFT JOIN tb_order_items i ON i.order_id = o.id
         LEFT JOIN tb_products p ON p.id = i.product_id
         LEFT JOIN tb_categories pc ON pc.id = p.category_id
        WHERE o.deleted_at IS NULL AND o.status <> 'cancelled'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 6`,
    ) as { name: string; value: string }[];

    const topStores = await this.orderRepository
      .createQueryBuilder('o')
      .innerJoin('o.store', 's')
      .select('s.id', 'id')
      .addSelect('s.name', 'name')
      .addSelect('COALESCE(SUM(o.total), 0)', 'sales')
      .addSelect('COUNT(*)', 'orders')
      .where('o.status != :cancelled', { cancelled: 'cancelled' })
      .groupBy('s.id')
      .addGroupBy('s.name')
      .orderBy('sales', 'DESC')
      .limit(5)
      .getRawMany<{ id: number; name: string; sales: string; orders: string }>();

    const [activeStores, totalStores, unpublishedStores, totalClients, newClients, totalProducts] = await Promise.all([
      this.storeRepository.count({ where: { isActive: true } }),
      this.storeRepository.count(),
      this.storeRepository.count({ where: { isPublished: false, isActive: true } }),
      this.clientRepository.count(),
      this.clientRepository.createQueryBuilder('c').where('c.created_at >= :d', { d: startMonth }).getCount(),
      this.productRepository.count(),
    ]);

    const recentOrders = await this.baseOrderQuery().orderBy('o.createdAt', 'DESC').take(8).getMany();

    return {
      kpis: {
        salesVolume: current.volume,
        salesVariation: variation(current.volume, previous.volume),
        ordersMonth: current.orders,
        ordersVariation: variation(current.orders, previous.orders),
        ordersToday: today.orders,
        activeStores,
        totalStores,
        unpublishedStores,
        totalClients,
        newClients,
        totalProducts,
      },
      monthly,
      revenueByCategory: byCategory.map((r) => ({ name: r.name, value: Number(r.value) })),
      topStores: topStores.map((s) => ({ id: Number(s.id), name: s.name, sales: Number(s.sales), orders: Number(s.orders) })),
      recentOrders,
      alerts: await this.alerts(),
    };
  }

  /** Alertas operacionais calculados a partir do estado real da plataforma. */
  async alerts() {
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);
    const [pendingStores, oldPendingStores, openDisputes, pendingReviews, openReports, openTickets, outOfStock, pendingPayments] =
      await Promise.all([
        this.storeRepository.find({ where: { isPublished: false, isActive: true }, select: { id: true, name: true, createdAt: true } }),
        this.storeRepository
          .createQueryBuilder('s')
          .where('s.is_published = false AND s.is_active = true AND s.created_at < :d', { d: twoDaysAgo })
          .getCount(),
        this.disputeRepository.count({ where: { status: 'open' } }),
        this.reviewRepository.count({ where: { status: 'pending' } }),
        this.reportRepository.count({ where: { status: In(['open', 'in_review']) } }),
        this.ticketRepository.count({ where: { status: 'open' } }),
        this.productRepository.count({ where: { stockQuantity: 0, isActive: true } }),
        this.storeRepository.manager
          .query(`SELECT COUNT(*) AS n FROM tb_subscription_invoices WHERE status = 'awaiting_validation'`)
          .then((r: { n: string }[]) => Number(r[0]?.n ?? 0)),
      ]);

    const alerts: { id: string; level: 'critical' | 'warning' | 'info'; title: string; detail: string; href: string; count: number }[] = [];
    if (pendingStores.length) {
      alerts.push({
        id: 'stores',
        count: pendingStores.length,
        level: oldPendingStores ? 'critical' : 'warning',
        title: `${pendingStores.length} loja(s) por publicar`,
        detail: pendingStores.slice(0, 3).map((s) => s.name).join(', ') + (oldPendingStores ? ` · ${oldPendingStores} há mais de 48h` : ''),
        href: '/admin/lojas',
      });
    }
    if (pendingPayments) {
      alerts.push({ id: 'payments', count: pendingPayments, level: 'critical', title: `${pendingPayments} pagamento(s) por validar`, detail: 'Comprovativos de subscrição à espera de confirmação', href: '/admin/pagamentos' });
    }
    if (openDisputes) {
      alerts.push({ id: 'disputes', count: openDisputes, level: 'critical', title: `${openDisputes} disputa(s) aberta(s)`, detail: 'A aguardar arbitragem', href: '/admin/disputas' });
    }
    if (openTickets) {
      alerts.push({ id: 'tickets', count: openTickets, level: 'warning', title: `${openTickets} ticket(s) sem resposta`, detail: 'Clientes e vendedores à espera de suporte', href: '/admin/tickets' });
    }
    if (openReports) {
      alerts.push({ id: 'reports', count: openReports, level: 'warning', title: `${openReports} denúncia(s) por tratar`, detail: 'Lojas, produtos ou avaliações denunciadas', href: '/admin/denuncias' });
    }
    if (pendingReviews) {
      alerts.push({ id: 'reviews', count: pendingReviews, level: 'info', title: `${pendingReviews} avaliação(ões) por moderar`, detail: 'Aguardam aprovação para ficarem públicas', href: '/admin/avaliacoes' });
    }
    if (outOfStock) {
      alerts.push({ id: 'stock', count: outOfStock, level: 'info', title: `${outOfStock} produto(s) sem stock`, detail: 'Produtos ativos com stock a zero', href: '/admin/produtos' });
    }
    return alerts;
  }

  /* ------------------------------- ORDERS -------------------------------- */

  private baseOrderQuery() {
    return this.orderRepository
      .createQueryBuilder('o')
      .leftJoin('o.store', 'store')
      .addSelect(['store.id', 'store.name', 'store.slug'])
      .leftJoin('o.client', 'client')
      .addSelect(['client.id', 'client.name', 'client.email']);
  }

  async listOrders(page = 1, limit = 20, status?: string, search?: string, storeId?: number) {
    const qb = this.baseOrderQuery()
      .orderBy('o.createdAt', 'DESC');
    if (status === 'disputed') {
      qb.andWhere(`EXISTS (SELECT 1 FROM tb_disputes d WHERE d.order_id = o.id AND d.status IN ('open','in_review') AND d.deleted_at IS NULL)`);
    } else if (status) {
      qb.andWhere('o.status = :status', { status });
    }
    if (storeId) qb.andWhere('o.store_id = :storeId', { storeId });
    if (search) {
      const digits = search.replace(/\D/g, '');
      qb.andWhere(
        `(o.customerName ILIKE :s OR o.customerPhone ILIKE :s OR o.customerEmail ILIKE :s OR store.name ILIKE :s${digits ? ' OR o.id = :id' : ''})`,
        { s: `%${search}%`, id: Number(digits) || 0 },
      );
    }
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    const disputed = data.length
      ? await this.disputeRepository.find({
          where: { orderId: In(data.map((o) => o.id)), status: In(['open', 'in_review']) },
          select: { orderId: true },
        })
      : [];
    const disputedIds = new Set(disputed.map((d) => d.orderId));

    const summary = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.total), 0)', 'total')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string; total: string }>();
    const openDisputes = await this.disputeRepository.count({ where: { status: In(['open', 'in_review']) } });

    return {
      ...paginate(
        data.map((o) => ({ ...o, hasOpenDispute: disputedIds.has(o.id) })),
        total,
        page,
        limit,
      ),
      summary: {
        byStatus: Object.fromEntries(summary.map((r) => [r.status, { count: Number(r.count), total: Number(r.total) }])),
        openDisputes,
      },
    };
  }

  async getOrder(id: number) {
    const order = await this.baseOrderQuery()
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.statusHistory', 'history')
      .where('o.id = :id', { id })
      .orderBy('history.createdAt', 'ASC')
      .getOne();
    if (!order) throw new NotFoundException(`Pedido #${id} não encontrado`);
    const disputes = await this.disputeRepository.find({ where: { orderId: id }, order: { createdAt: 'DESC' } });
    return { ...order, disputes };
  }

  async updateOrderStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Pedido #${id} não encontrado`);
    if (order.status === dto.status) throw new BadRequestException('O pedido já se encontra neste estado');
    await this.historyRepository.save(
      this.historyRepository.create({
        orderId: id,
        status: dto.status,
        note: dto.note ? `[Admin] ${dto.note}` : '[Admin] Estado alterado pelo painel master',
        changedBy: null,
      }),
    );
    order.status = dto.status;
    if (dto.trackingCode) order.trackingCode = dto.trackingCode;
    await this.orderRepository.save(order);
    return this.getOrder(id);
  }

  /* ---------------------------- STORE USERS ------------------------------ */

  async listStoreUsers(page = 1, limit = 50, search?: string) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.phone', 'u.isActive', 'u.rootAdmin', 'u.storeId', 'u.createdAt', 'u.updatedAt'])
      .orderBy('u.createdAt', 'DESC');
    if (search) qb.where('(u.name ILIKE :s OR u.email ILIKE :s OR u.phone ILIKE :s)', { s: `%${search}%` });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const storeIds = [...new Set(data.map((u) => u.storeId).filter((id): id is number => id != null))];
    const stores = storeIds.length
      ? await this.storeRepository.find({ where: { id: In(storeIds) }, select: { id: true, name: true, slug: true } })
      : [];
    const storeMap = new Map(stores.map((s) => [s.id, s]));
    return paginate(
      data.map((u) => ({ ...u, store: u.storeId ? (storeMap.get(u.storeId) ?? null) : null })),
      total,
      page,
      limit,
    );
  }

  async updateStoreUser(id: number, isActive?: boolean) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilizador #${id} não encontrado`);
    if (isActive !== undefined) user.isActive = isActive;
    const { password: _p, refreshToken: _r, ...saved } = await this.userRepository.save(user);
    return saved;
  }

  /* ---------------------------- STORE DETAIL ----------------------------- */

  async storeOverview(id: number) {
    const store = await this.storeRepository.findOne({ where: { id }, relations: { category: true } });
    if (!store) throw new NotFoundException(`Loja #${id} não encontrada`);

    const [users, products, totals, recentOrders, subscription, openDisputes] = await Promise.all([
      this.userRepository.find({
        where: { storeId: id },
        select: { id: true, name: true, email: true, phone: true, isActive: true, rootAdmin: true, createdAt: true, updatedAt: true },
        order: { rootAdmin: 'DESC', createdAt: 'ASC' },
      }),
      this.productRepository.count({ where: { storeId: id } }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('COUNT(*)', 'orders')
        .addSelect(`COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0)`, 'sales')
        .addSelect(`COUNT(DISTINCT o.customer_phone)`, 'customers')
        .where('o.store_id = :id', { id })
        .getRawOne<{ orders: string; sales: string; customers: string }>(),
      this.orderRepository.find({ where: { storeId: id }, order: { createdAt: 'DESC' }, take: 10 }),
      this.billing.overview(id),
      this.disputeRepository.count({ where: { storeId: id, status: In(['open', 'in_review']) } }),
    ]);

    return {
      store,
      users,
      stats: {
        products,
        orders: Number(totals?.orders ?? 0),
        sales: Number(totals?.sales ?? 0),
        customers: Number(totals?.customers ?? 0),
        openDisputes,
      },
      subscription,
      recentOrders,
    };
  }
}
