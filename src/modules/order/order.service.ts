import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Product } from '../product/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { CouponService } from '../billing/coupon.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly coupons: CouponService,
  ) {}

  async create(dto: CreateOrderDto, clientId?: number) {
    const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
    if (!store || !store.isActive) {
      throw new BadRequestException('Esta loja não está disponível para encomendas');
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    if (productIds.length !== dto.items.length) {
      throw new BadRequestException('Produto repetido no pedido');
    }

    // Entrega / levantamento
    const deliveryType = dto.deliveryType ?? 'delivery';
    let shippingCost = 0;
    let deliveryZone: string | null = null;
    let deliveryDays: number | null = null;
    if (deliveryType === 'delivery') {
      const zones = store.deliveryZones ?? [];
      if (zones.length) {
        const zone = zones.find((z) => z.id === dto.deliveryZoneId);
        if (!zone) throw new BadRequestException('Escolha uma zona de entrega válida');
        shippingCost = Number(zone.custo) || 0;
        deliveryZone = zone.nome;
        deliveryDays = Number(zone.prazoDias) || null;
      }
      if (!dto.shippingAddress?.trim()) {
        throw new BadRequestException('Indique a morada de entrega');
      }
    } else {
      deliveryZone = store.pickupLocation ?? store.address ?? 'Levantamento na loja';
    }

    // Método de pagamento tem de estar ativo na loja (quando a loja configurou métodos)
    if (dto.paymentMethod && store.payments && !store.payments[dto.paymentMethod]) {
      throw new BadRequestException('Método de pagamento não aceite por esta loja');
    }

    const savedId = await this.orderRepository.manager.transaction(async (manager) => {
      const products = await manager.getRepository(Product).find({
        where: { id: In(productIds), storeId: dto.storeId },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('Um ou mais produtos não existem nesta loja');
      }
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const orderItems: Partial<OrderItem>[] = [];
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        if (!product.isActive || !product.isPublished) {
          throw new BadRequestException(`O produto "${product.name}" não está disponível`);
        }
        // Decremento atómico: falha se outro pedido esgotou o stock entretanto
        const result = await manager
          .createQueryBuilder()
          .update(Product)
          .set({
            stockQuantity: () => `stock_quantity - ${Number(item.quantity)}`,
            totalSales: () => `total_sales + ${Number(item.quantity)}`,
          })
          .where('id = :id AND stock_quantity >= :qty', { id: product.id, qty: item.quantity })
          .execute();
        if (!result.affected) {
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Disponível: ${product.stockQuantity}`,
          );
        }

        const itemSubtotal = Number(product.price) * item.quantity;
        subtotal += itemSubtotal;
        orderItems.push({
          productId: product.id,
          productName: product.name,
          productPrice: Number(product.price),
          quantity: item.quantity,
          subtotal: itemSubtotal,
        });
      }

      // Cupão da loja (validado e consumido dentro da mesma transação)
      let discountAmount = 0;
      let couponCode: string | null = null;
      if (dto.couponCode?.trim()) {
        const { coupon, discount } = await this.coupons.evaluate(dto.storeId, dto.couponCode, subtotal, manager);
        await this.coupons.consume(manager, coupon.id);
        discountAmount = discount;
        couponCode = coupon.code;
      }

      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          storeId: dto.storeId,
          clientId: clientId ?? null,
          customerName: dto.customerName.trim(),
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone.trim(),
          shippingAddress: dto.shippingAddress?.trim(),
          customerProvince: dto.customerProvince,
          customerCity: dto.customerCity,
          notes: dto.notes,
          deliveryType,
          deliveryZone,
          deliveryDays,
          paymentMethod: dto.paymentMethod ?? null,
          subtotal,
          shippingCost,
          discountAmount,
          couponCode,
          total: subtotal - discountAmount + shippingCost,
          status: 'pending',
        }),
      );

      await manager
        .getRepository(OrderItem)
        .save(orderItems.map((item) => manager.getRepository(OrderItem).create({ ...item, orderId: order.id })));
      await manager.getRepository(OrderStatusHistory).save(
        manager.getRepository(OrderStatusHistory).create({ orderId: order.id, status: 'pending', note: 'Pedido criado' }),
      );
      return order.id;
    });

    return this.findOne(savedId, dto.storeId);
  }

  /** Rastreio público: exige a referência (NG-00012 ou 12) e o telefone usado no pedido. */
  async track(reference: string, phone: string) {
    const id = Number(reference.replace(/\D/g, ''));
    const digits = (v: string) => v.replace(/\D/g, '').slice(-9);
    if (!id || digits(phone).length < 9) throw new NotFoundException('Pedido não encontrado');

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true, statusHistory: true, store: true },
      order: { statusHistory: { createdAt: 'ASC' } },
    });
    if (!order || digits(order.customerPhone) !== digits(phone)) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return this.publicView(order);
  }

  async findByClient(clientId: number) {
    const orders = await this.orderRepository.find({
      where: { clientId },
      relations: { items: true, statusHistory: true, store: true },
      order: { createdAt: 'DESC', statusHistory: { createdAt: 'ASC' } },
    });
    return orders.map((o) => this.publicView(o));
  }

  async findOneForClient(id: number, clientId: number) {
    const order = await this.orderRepository.findOne({
      where: { id, clientId },
      relations: { items: true, statusHistory: true, store: true },
      order: { statusHistory: { createdAt: 'ASC' } },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return this.publicView(order);
  }

  private publicView(order: Order) {
    const { store, ...rest } = order;
    return {
      ...rest,
      store: store
        ? { id: store.id, name: store.name, slug: store.slug, logoUrl: store.logoUrl, whatsapp: store.whatsapp }
        : null,
    };
  }

  async findAll(storeId: number, page = 1, limit = 10, search?: string) {
    if (!storeId) throw new ForbiddenException('Apenas contas de loja');
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.store_id = :storeId', { storeId })
      .orderBy('order.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(order.customerName ILIKE :search OR order.customerPhone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, storeId: number) {
    if (!storeId) throw new ForbiddenException('Apenas contas de loja');
    const order = await this.orderRepository.findOne({
      where: { id, storeId },
      relations: { items: true, statusHistory: true },
    });

    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    return order;
  }

  async updateStatus(
    id: number,
    storeId: number,
    dto: UpdateOrderStatusDto,
    userId: number,
  ) {
    const order = await this.findOne(id, storeId);

    const history = this.statusHistoryRepository.create({
      orderId: order.id,
      status: dto.status,
      note: dto.note,
      changedBy: userId,
    });
    await this.statusHistoryRepository.save(history);

    order.status = dto.status;
    if (dto.trackingCode) {
      order.trackingCode = dto.trackingCode;
    }
    await this.orderRepository.save(order);

    return this.findOne(id, storeId);
  }

  async getStats(storeId: number) {
    if (!storeId) throw new ForbiddenException('Apenas contas de loja');
    const totalOrders = await this.orderRepository.count({
      where: { storeId },
    });

    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.store_id = :storeId', { storeId })
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total), 0)', 'total')
      .where('order.store_id = :storeId', { storeId })
      .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
      .getRawOne<{ total: string }>();

    const recentOrders = await this.orderRepository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { items: true },
    });

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      totalOrders,
      totalRevenue: Number(totalRevenue?.total ?? 0),
      byStatus,
      recentOrders,
    };
  }
}
