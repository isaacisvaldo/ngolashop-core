import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { StoreSubscription } from './entities/subscription.entity';
import { Plan } from '../shared/plan/entities/plan.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(StoreSubscription)
    private readonly subscriptionRepository: Repository<StoreSubscription>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async create(dto: CreateSubscriptionDto) {
    const sub = this.subscriptionRepository.create({
      store: { id: dto.storeId },
      plan: { id: dto.planId },
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: 'active',
    });
    return this.subscriptionRepository.save(sub);
  }

  async findAll(storeId: number, page = 1, limit = 10) {
    const [data, total] = await this.subscriptionRepository.findAndCount({
      where: { store: { id: storeId } },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findActiveByStore(storeId: number) {
    const now = new Date();
    const sub = await this.subscriptionRepository.findOne({
      where: {
        store: { id: storeId },
        status: 'active',
        startDate: LessThanOrEqual(now),
      },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });

    if (sub && sub.endDate && sub.endDate < now) {
      sub.status = 'expired';
      await this.subscriptionRepository.save(sub);
      return null;
    }

    return sub;
  }

  async findOne(id: number) {
    const sub = await this.subscriptionRepository.findOne({
      where: { id },
      relations: { plan: true, store: true },
    });
    if (!sub) throw new NotFoundException(`Subscription #${id} not found`);
    return sub;
  }

  async update(id: number, dto: UpdateSubscriptionDto) {
    const sub = await this.findOne(id);

    if (dto.planId !== undefined) sub.plan = { id: dto.planId } as any;
    if (dto.endDate !== undefined) sub.endDate = new Date(dto.endDate);
    if (dto.status !== undefined) sub.status = dto.status;

    return this.subscriptionRepository.save(sub);
  }

  async cancel(id: number) {
    const sub = await this.findOne(id);
    if (sub.status !== 'active') {
      throw new BadRequestException('Subscription is not active');
    }
    sub.status = 'cancelled';
    return this.subscriptionRepository.save(sub);
  }

  async renew(storeId: number, planId?: number, durationDays?: number) {
    const now = new Date();
    const days = durationDays && durationDays > 0 ? durationDays : 30;
    const current = await this.findActiveByStore(storeId);

    const activePlanId = planId ?? current?.plan?.id;
    if (!activePlanId) {
      throw new BadRequestException('No plan specified and no active subscription found');
    }

    const targetPlan = await this.planRepository.findOne({ where: { id: activePlanId } });
    if (!targetPlan) {
      throw new NotFoundException('Plan not found');
    }
    if (Number(targetPlan.price) === 0) {
      throw new BadRequestException('Não é possível renovar ou escolher o plano Grátis');
    }

    let amount = Number(targetPlan.price);
    if (durationDays && durationDays >= 90 && targetPlan.priceQuarterly) {
      amount = Number(targetPlan.priceQuarterly);
    } else if (durationDays && durationDays >= 365 && targetPlan.priceAnnual) {
      amount = Number(targetPlan.priceAnnual);
    } else {
      amount = Number(targetPlan.price) * Math.ceil(days / 30);
    }

    const sub = this.subscriptionRepository.create({
      store: { id: storeId },
      plan: { id: activePlanId },
      startDate: current?.endDate && current.endDate > now ? current.endDate : now,
      endDate: null,
      status: 'pending',
      paymentStatus: 'pending',
      amount,
      durationDays: days,
    });
    return this.subscriptionRepository.save(sub);
  }

  async confirmPayment(subId: number, paymentRef?: string) {
    const sub = await this.findOne(subId);
    if (sub.paymentStatus !== 'pending') {
      throw new BadRequestException('Subscription is not pending payment');
    }

    const now = new Date();
    sub.paymentStatus = 'paid';
    sub.status = 'active';
    sub.paidAt = now;
    sub.paymentRef = paymentRef || null;

    const days = sub.durationDays || 30;
    const base = sub.startDate && sub.startDate > now ? sub.startDate : now;
    sub.startDate = base;
    sub.endDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    return this.subscriptionRepository.save(sub);
  }

  async getPendingByStore(storeId: number) {
    return this.subscriptionRepository.findOne({
      where: { store: { id: storeId }, paymentStatus: 'pending' },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  async checkStoreLimit(
    storeId: number,
    resource: string,
  ): Promise<{ allowed: boolean; current: number; limit: number | null }> {
    const sub = await this.findActiveByStore(storeId);
    if (!sub) return { allowed: false, current: 0, limit: 0 };

    const plan = sub.plan;
    if (!plan) return { allowed: false, current: 0, limit: 0 };

    const now = new Date();

    switch (resource) {
      case 'products': {
        const count = await this.subscriptionRepository.manager
          .createQueryBuilder('product', 'p')
          .where('p.store_id = :storeId', { storeId })
          .andWhere('p.is_active = true')
          .getCount();
        return {
          allowed: plan.limitProducts === null || count < plan.limitProducts,
          current: count,
          limit: plan.limitProducts,
        };
      }
      case 'users': {
        const count = await this.subscriptionRepository.manager
          .createQueryBuilder('u', 'u')
          .where('u.store_id = :storeId', { storeId })
          .andWhere('u.deleted_at IS NULL')
          .getCount();
        return {
          allowed: plan.limitUsers === null || count < plan.limitUsers,
          current: count,
          limit: plan.limitUsers,
        };
      }
      case 'orders': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const count = await this.subscriptionRepository.manager
          .createQueryBuilder('order', 'o')
          .where('o.store_id = :storeId', { storeId })
          .andWhere('o.created_at >= :startOfMonth', { startOfMonth })
          .getCount();
        return {
          allowed:
            plan.limitOrdersPerMonth === null ||
            count < plan.limitOrdersPerMonth,
          current: count,
          limit: plan.limitOrdersPerMonth,
        };
      }
      default:
        return { allowed: true, current: 0, limit: null };
    }
  }
}
