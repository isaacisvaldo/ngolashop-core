import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './modules/shared/auth/auth.module';
import { StoreModule } from './modules/store/store.module';
import { CategoryModule } from './modules/shared/category/category.module';
import { PlanModule } from './modules/shared/plan/plan.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { UserModule } from './modules/store/user/user.module';
import { RoleModule } from './modules/shared/role/role.module';
import { BillingCoreModule } from './modules/billing/billing-core.module';
import { BillingModule } from './modules/billing/billing.module';
import { CountryModule } from './modules/shared/country/country.module';
import { ProvinceModule } from './modules/shared/province/province.module';
import { PaymentMethodModule } from './modules/payment-method/payment-method.module';
import { EmailModule } from './modules/shared/email/email.module';
import { UploadModule } from './modules/shared/upload/upload.module';
import { StatsModule } from './modules/stats/stats.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { PermissionModule } from './modules/permission/permission.module';
import { ClientModule } from './modules/client/client.module';
import { SettingModule } from './modules/setting/setting.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReviewModule } from './modules/review/review.module';
import { DisputeModule } from './modules/dispute/dispute.module';
import { ReportModule } from './modules/report/report.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';
import { FavoriteModule } from './modules/favorite/favorite.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return '.env.prod';
          case 'preprod':
            return '.env.preprod';
          default:
            return '.env.dev';
        }
      })(),
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    EmailModule,
    UploadModule,
    AuthModule,
    StoreModule,
    CategoryModule,
    PlanModule,
    ProductModule,
    OrderModule,
    UserModule,
    RoleModule,
    BillingCoreModule,
    BillingModule,
    CountryModule,
    ProvinceModule,
    PaymentMethodModule,
    StatsModule,
    AdminUserModule,
    PermissionModule,
    ClientModule,
    SettingModule,
    AuditModule,
    ReviewModule,
    DisputeModule,
    ReportModule,
    TicketModule,
    AdminPanelModule,
    FavoriteModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
