import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { requireUserType } from '../../common/require-user-type';
import { StatsService } from './stats.service';
import { BillingService } from '../billing/billing.service';
import { EventService } from '../billing/event.service';

const LEVELS = ['basic', 'sales', 'advanced', 'advanced_export'] as const;
const atLeast = (level: string, min: (typeof LEVELS)[number]) => LEVELS.indexOf(level as never) >= LEVELS.indexOf(min);

@ApiTags('Stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly billing: BillingService,
    private readonly events: EventService,
  ) {}

  @Get('my')
  @ApiOperation({ summary: 'Estatísticas da loja (detalhe conforme o plano)' })
  async getMyStats(@CurrentUser() user: JwtPayload) {
    const storeId = requireUserType(user, 'store').storeId!;
    const [full, traffic, plan] = await Promise.all([
      this.statsService.getStoreStats(storeId),
      this.events.summary(storeId),
      this.billing.features(storeId),
    ]);
    const level = plan.statisticsLevel;
    const sales = atLeast(level, 'sales');
    const advanced = atLeast(level, 'advanced');
    const o = full.overview;

    return {
      level,
      plan: { name: plan.name, slug: plan.slug },
      locked: [
        ...(sales ? [] : ['revenue', 'topProducts', 'dailyRevenue', 'topViewed']),
        ...(advanced ? [] : ['topCustomers', 'salesByLocation']),
        ...(atLeast(level, 'advanced_export') ? [] : ['export']),
      ],
      traffic: { ...traffic, topViewed: sales ? traffic.topViewed : [] },
      overview: {
        totalOrders: o.totalOrders,
        ordersThisMonth: o.ordersThisMonth,
        ordersThisWeek: o.ordersThisWeek,
        ordersToday: o.ordersToday,
        totalProducts: o.totalProducts,
        activeProducts: o.activeProducts,
        outOfStock: o.outOfStock,
        totalStock: o.totalStock,
        totalCustomers: o.totalCustomers,
        ...(sales
          ? {
              totalRevenue: o.totalRevenue,
              revenueThisMonth: o.revenueThisMonth,
              revenueThisWeek: o.revenueThisWeek,
              avgOrderValue: o.avgOrderValue,
              avgOrderValueMonth: o.avgOrderValueMonth,
              revenueGrowth: o.revenueGrowth,
              orderGrowth: o.orderGrowth,
            }
          : {}),
      },
      ordersByStatus: full.ordersByStatus,
      topProducts: sales ? full.topProducts : [],
      dailyRevenue: sales ? full.dailyRevenue : [],
      topCustomers: advanced ? full.topCustomers : [],
      salesByLocation: advanced ? full.salesByLocation : [],
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar pedidos em CSV (plano Negócio)' })
  async export(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const storeId = requireUserType(user, 'store').storeId!;
    await this.billing.assertStatisticsLevel(storeId, 'advanced_export', 'A exportação de estatísticas');
    const csv = await this.statsService.exportOrdersCsv(storeId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pedidos-loja-${storeId}.csv"`);
    res.send('﻿' + csv);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get current store customers' })
  getMyCustomers(@CurrentUser('storeId') storeId: number) {
    return this.statsService.getStoreCustomers(storeId);
  }
}
