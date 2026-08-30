import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { Plan } from './entities/plan.entity';
import { PlanFeature } from './entities/plan-feature.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, PlanFeature]), AuthModule],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
