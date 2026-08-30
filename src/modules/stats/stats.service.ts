import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getStoreStats(storeId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalOrders,
      ordersThisMonth,
      ordersThisWeek,
      ordersToday,
      lastMonthOrders,
      allOrders,
    ] = await Promise.all([
      this.orderRepository.count({ where: { store: { id: storeId } } }),
      this.orderRepository.count({
        where: { store: { id: storeId }, createdAt: MoreThanOrEqual(startOfMonth) },
      }),
      this.orderRepository.count({
        where: { store: { id: storeId }, createdAt: MoreThanOrEqual(startOfWeek) },
      }),
      this.orderRepository.count({
        where: { store: { id: storeId }, createdAt: MoreThanOrEqual(startOfDay) },
      }),
      this.orderRepository.count({
        where: {
          store: { id: storeId },
          createdAt: Between(startOfLastMonth, endOfLastMonth),
        },
      }),
      this.orderRepository.find({
        where: { store: { id: storeId } },
        relations: { items: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
    const ordersThisMonthList = allOrders.filter(
      (o) => new Date(o.createdAt) >= startOfMonth,
    );
    const revenueThisMonth = ordersThisMonthList.reduce(
      (s, o) => s + Number(o.total),
      0,
    );
    const ordersLastMonthList = allOrders.filter(
      (o) => new Date(o.createdAt) >= startOfLastMonth && new Date(o.createdAt) <= endOfLastMonth,
    );
    const revenueLastMonth = ordersLastMonthList.reduce(
      (s, o) => s + Number(o.total),
      0,
    );
    const revenueThisWeek = allOrders
      .filter((o) => new Date(o.createdAt) >= startOfWeek)
      .reduce((s, o) => s + Number(o.total), 0);

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgOrderValueMonth = ordersThisMonth > 0 ? revenueThisMonth / ordersThisMonth : 0;

    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    const customers = new Map<string, { name: string; phone: string; orders: number; totalSpent: number }>();
    for (const o of allOrders) {
      const key = o.customerPhone || o.customerName;
      const existing = customers.get(key);
      if (existing) {
        existing.orders += 1;
        existing.totalSpent += Number(o.total);
      } else {
        customers.set(key, {
          name: o.customerName,
          phone: o.customerPhone,
          orders: 1,
          totalSpent: Number(o.total),
        });
      }
    }

    const topCustomers = [...customers.values()]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const products = await this.productRepository.find({
      where: { store: { id: storeId } },
    });
    const activeProducts = products.filter((p) => p.isActive).length;
    const totalStock = products.reduce((s, p) => s + p.stockQuantity, 0);
    const outOfStock = products.filter((p) => p.stockQuantity === 0 && p.isActive).length;

    const productSales = new Map<number, { name: string; sold: number; revenue: number }>();
    for (const o of allOrders) {
      for (const item of o.items || []) {
        const existing = productSales.get(item.productId);
        const qty = item.quantity || 1;
        const rev = Number(item.productPrice || 0) * qty;
        if (existing) {
          existing.sold += qty;
          existing.revenue += rev;
        } else {
          const prod = products.find((p) => p.id === item.productId);
          productSales.set(item.productId, {
            name: prod?.name || `Produto #${item.productId}`,
            sold: qty,
            revenue: rev,
          });
        }
      }
    }
    const topProducts = [...productSales.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueGrowth =
      revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : revenueThisMonth > 0
          ? 100
          : 0;

    const orderGrowth =
      lastMonthOrders > 0
        ? Math.round(((ordersThisMonth - lastMonthOrders) / lastMonthOrders) * 100)
        : ordersThisMonth > 0
          ? 100
          : 0;

    const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayOrders = allOrders.filter((o) => {
        const cd = new Date(o.createdAt);
        return cd >= d && cd < nextDay;
      });
      dailyRevenue.push({
        date: d.toISOString().split('T')[0],
        revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
        orders: dayOrders.length,
      });
    }

    return {
      overview: {
        totalRevenue,
        revenueThisMonth,
        revenueThisWeek,
        avgOrderValue: Math.round(avgOrderValue),
        avgOrderValueMonth: Math.round(avgOrderValueMonth),
        revenueGrowth,
        totalOrders,
        ordersThisMonth,
        ordersThisWeek,
        ordersToday,
        orderGrowth,
        totalCustomers: customers.size,
        totalProducts: products.length,
        activeProducts,
        totalStock,
        outOfStock,
      },
      ordersByStatus: statusCounts,
      topProducts,
      topCustomers,
      dailyRevenue,
      salesByLocation: this.buildLocationData(allOrders),
    };
  }

  private buildLocationData(orders: Order[]) {
    const locationMap = new Map<string, {
      province: string;
      city: string;
      lat: number;
      lng: number;
      orders: number;
      revenue: number;
    }>();

    for (const o of orders) {
      const province = o.customerProvince || 'Desconhecido';
      const city = o.customerCity || 'Desconhecido';
      const lat = o.customerLat ? Number(o.customerLat) : null;
      const lng = o.customerLng ? Number(o.customerLng) : null;

      if (!lat || !lng) continue;

      const key = `${province}-${city}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.orders += 1;
        existing.revenue += Number(o.total);
      } else {
        locationMap.set(key, {
          province,
          city,
          lat,
          lng,
          orders: 1,
          revenue: Number(o.total),
        });
      }
    }

    return [...locationMap.values()].sort((a, b) => b.revenue - a.revenue);
  }
}
