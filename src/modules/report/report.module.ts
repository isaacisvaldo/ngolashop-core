import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/entities/product.entity';
import { Client } from '../client/entities/client.entity';
import { Review } from '../review/entities/review.entity';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Store, Product, Client, Review]), AuthModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
