import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../product/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { Client } from '../client/entities/client.entity';
import { Order } from '../order/entities/order.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Product, Store, Client, Order]), AuthModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
