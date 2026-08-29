import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Product } from '../product/entities/product.entity';
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
  ) {}

  async create(dto: CreateOrderDto) {
    const storeId = dto.storeId;
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.productRepository.find({
      where: productIds.map((id) => ({ id, storeId })),
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException(
        'One or more products not found in this store',
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product "${product.name}". Available: ${product.stockQuantity}`,
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

    const order = this.orderRepository.create({
      storeId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      shippingAddress: dto.shippingAddress,
      notes: dto.notes,
      subtotal,
      shippingCost: 0,
      total: subtotal,
      status: 'pending',
    });

    const savedOrder = await this.orderRepository.save(order);

    const items = orderItems.map((item) =>
      this.orderItemRepository.create({ ...item, orderId: savedOrder.id }),
    );
    await this.orderItemRepository.save(items);

    const history = this.statusHistoryRepository.create({
      orderId: savedOrder.id,
      status: 'pending',
      note: 'Order created',
    });
    await this.statusHistoryRepository.save(history);

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      product.stockQuantity -= item.quantity;
      product.totalSales += item.quantity;
      await this.productRepository.save(product);
    }

    return this.findOne(savedOrder.id, storeId);
  }

  async findAll(storeId: number, page = 1, limit = 10, search?: string) {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.storeId = :storeId', { storeId })
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
    const totalOrders = await this.orderRepository.count({
      where: { storeId },
    });

    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.storeId = :storeId', { storeId })
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total), 0)', 'total')
      .where('order.storeId = :storeId', { storeId })
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
