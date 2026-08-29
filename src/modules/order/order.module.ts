import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Product } from '../product/entities/product.entity';
import { AuthModule } from '../shared/auth/auth.module';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Product]),
    AuthModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
