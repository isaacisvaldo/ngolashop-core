import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../shared/plan/entities/plan.entity';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../shared/auth/entities/user.entity';
import { StoreSubscription } from '../subscription/entities/subscription.entity';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { StoreEvent } from './entities/store-event.entity';
import { Coupon } from './entities/coupon.entity';
import { BillingService } from './billing.service';
import { CouponService } from './coupon.service';
import { EventService } from './event.service';
import { EmailModule } from '../shared/email/email.module';

/** Serviços de faturação partilhados (sem controladores) — global para evitar dependências circulares com Auth. */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Store, Product, User, StoreSubscription, SubscriptionInvoice, StoreEvent, Coupon]),
    EmailModule,
  ],
  providers: [BillingService, CouponService, EventService],
  exports: [BillingService, CouponService, EventService, TypeOrmModule],
})
export class BillingCoreModule {}
