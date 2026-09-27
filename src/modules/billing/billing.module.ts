import { Module } from '@nestjs/common';
import { AuthModule } from '../shared/auth/auth.module';
import {
  BillingAdminController, BillingPublicController, BillingStoreController, CouponController, EventController,
} from './billing.controller';
import { HighlightAdminController, HighlightPublicController, HighlightStoreController } from './highlight.controller';

@Module({
  imports: [AuthModule],
  controllers: [BillingPublicController, BillingStoreController, BillingAdminController, CouponController, EventController, HighlightPublicController, HighlightStoreController, HighlightAdminController],
})
export class BillingModule {}
