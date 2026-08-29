import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { PlanFeature } from './entities/plan-feature.entity';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(PlanFeature)
    private readonly featureRepository: Repository<PlanFeature>,
  ) {}

  async findAll() {
    const plans = await this.planRepository.find({
      where: { isActive: true },
      relations: { features: true },
      order: { position: 'ASC' },
    });
    return plans;
  }

  async findOne(id: number) {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: { features: true },
    });
    if (!plan) {
      throw new NotFoundException(`Plan #${id} not found`);
    }
    return plan;
  }
}
