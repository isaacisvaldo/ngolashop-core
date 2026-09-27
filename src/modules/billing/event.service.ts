import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEvent } from './entities/store-event.entity';
import { Store } from '../store/entities/store.entity';
import { TrackEventDto } from './dto/billing.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(StoreEvent) private readonly eventRepository: Repository<StoreEvent>,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
  ) {}

  async track(dto: TrackEventDto) {
    const exists = await this.storeRepository.exists({ where: { id: dto.storeId } });
    if (!exists) throw new NotFoundException('Loja não encontrada');

    // Evita contar a mesma visita repetidamente (recarregar a página) durante 30 minutos
    if (dto.visitorId && (dto.type === 'store_view' || dto.type === 'product_view')) {
      const dup = await this.eventRepository
        .createQueryBuilder('e')
        .where('e.store_id = :s AND e.type = :t AND e.visitor_id = :v', { s: dto.storeId, t: dto.type, v: dto.visitorId })
        .andWhere(dto.productId ? 'e.product_id = :p' : 'e.product_id IS NULL', { p: dto.productId })
        .andWhere(`e.created_at > NOW() - INTERVAL '30 minutes'`)
        .getExists();
      if (dup) return { tracked: false };
    }
    await this.eventRepository.insert({
      storeId: dto.storeId,
      productId: dto.productId ?? null,
      type: dto.type,
      source: dto.highlightId ? 'highlight' : 'organic',
      highlightId: dto.highlightId ?? null,
      visitorId: dto.visitorId ?? null,
    });
    return { tracked: true };
  }

  /** Resumo de tráfego da loja para as estatísticas (mês atual vs. anterior + série diária). */
  async summary(storeId: number) {
    const m = this.eventRepository.manager;
    const totals = (await m.query(
      `SELECT type,
              COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS this_month,
              COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
                                 AND created_at < date_trunc('month', NOW())) AS last_month,
              COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS visitors_this_month
         FROM tb_store_events WHERE store_id = $1 GROUP BY type`,
      [storeId],
    )) as { type: string; this_month: string; last_month: string; visitors_this_month: string }[];
    const by = (t: string) => totals.find((r) => r.type === t);
    const views = (t: string, k: 'this_month' | 'last_month') => Number(by(t)?.[k] ?? 0);

    const daily = (await m.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(CASE WHEN e.type IN ('store_view','product_view') THEN 1 ELSE 0 END), 0) AS views,
              COALESCE(SUM(CASE WHEN e.type = 'whatsapp_click' THEN 1 ELSE 0 END), 0) AS whatsapp
         FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, INTERVAL '1 day') d
         LEFT JOIN tb_store_events e ON e.store_id = $1 AND e.created_at >= d AND e.created_at < d + INTERVAL '1 day'
        GROUP BY d ORDER BY d`,
      [storeId],
    )) as { date: string; views: string; whatsapp: string }[];

    const topViewed = (await m.query(
      `SELECT p.id, p.name, COUNT(*) AS views,
              COUNT(*) FILTER (WHERE e.type = 'whatsapp_click') AS whatsapp
         FROM tb_store_events e JOIN tb_products p ON p.id = e.product_id
        WHERE e.store_id = $1 AND e.created_at >= NOW() - INTERVAL '30 days' AND e.type IN ('product_view','whatsapp_click')
        GROUP BY p.id, p.name ORDER BY views DESC LIMIT 10`,
      [storeId],
    )) as { id: number; name: string; views: string; whatsapp: string }[];

    const visitsThis = views('store_view', 'this_month') + views('product_view', 'this_month');
    const visitsLast = views('store_view', 'last_month') + views('product_view', 'last_month');
    return {
      visits: { thisMonth: visitsThis, lastMonth: visitsLast },
      uniqueVisitorsThisMonth: Number(by('store_view')?.visitors_this_month ?? 0) + Number(by('product_view')?.visitors_this_month ?? 0),
      storeViews: { thisMonth: views('store_view', 'this_month'), lastMonth: views('store_view', 'last_month') },
      productViews: { thisMonth: views('product_view', 'this_month'), lastMonth: views('product_view', 'last_month') },
      whatsappClicks: { thisMonth: views('whatsapp_click', 'this_month'), lastMonth: views('whatsapp_click', 'last_month') },
      daily: daily.map((d) => ({ date: d.date, views: Number(d.views), whatsapp: Number(d.whatsapp) })),
      topViewed: topViewed.map((p) => ({ id: Number(p.id), name: p.name, views: Number(p.views), whatsapp: Number(p.whatsapp) })),
    };
  }
}
