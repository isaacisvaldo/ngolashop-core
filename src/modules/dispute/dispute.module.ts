import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './entities/dispute.entity';
import { Order } from '../order/entities/order.entity';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, Order]), AuthModule],
  controllers: [DisputeController],
  providers: [DisputeService],
})
export class DisputeModule {}
