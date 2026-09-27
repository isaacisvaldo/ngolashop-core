import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderStatusHistory } from '../order/entities/order-status-history.entity';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/entities/product.entity';
import { Client } from '../client/entities/client.entity';
import { User } from '../shared/auth/entities/user.entity';
import { Dispute } from '../dispute/entities/dispute.entity';
import { Review } from '../review/entities/review.entity';
import { Report } from '../report/entities/report.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelController } from './admin-panel.controller';
import { AuthModule } from '../shared/auth/auth.module';
import { UserModule } from '../store/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderStatusHistory, Store, Product, Client, User, Dispute, Review, Report, Ticket]),
    AuthModule,
    UserModule,
  ],
  controllers: [AdminPanelController],
  providers: [AdminPanelService],
})
export class AdminPanelModule {}
