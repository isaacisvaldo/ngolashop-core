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
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { CountryModule } from './modules/shared/country/country.module';
import { ProvinceModule } from './modules/shared/province/province.module';
import { PaymentMethodModule } from './modules/payment-method/payment-method.module';
import { EmailModule } from './modules/shared/email/email.module';
import { UploadModule } from './modules/shared/upload/upload.module';
import { StatsModule } from './modules/stats/stats.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { PermissionModule } from './modules/permission/permission.module';

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
    SubscriptionModule,
    CountryModule,
    ProvinceModule,
    PaymentMethodModule,
    StatsModule,
    AdminUserModule,
    PermissionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
