import { Module } from '@nestjs/common';
import { AuthModule } from '../shared/auth/auth.module';
import {
  BillingAdminController, BillingPublicController, BillingStoreController, CouponController, EventController,
} from './billing.controller';

@Module({
  imports: [AuthModule],
  controllers: [BillingPublicController, BillingStoreController, BillingAdminController, CouponController, EventController],
})
export class BillingModule {}
