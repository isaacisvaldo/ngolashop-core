import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from './database/data-source';
import { StoreModule } from './modules/store/store.module';
import { AuthModule } from './modules/shared/auth/auth.module';
import { CategoryModule } from './modules/shared/category/category.module';
import { PlanModule } from './modules/shared/plan/plan.module';

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
    StoreModule,
    AuthModule,
    CategoryModule,
    PlanModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
