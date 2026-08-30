import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { PlanFeature } from './entities/plan-feature.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(PlanFeature)
    private readonly featureRepository: Repository<PlanFeature>,
  ) {}

  async findAll() {
    return this.planRepository.find({
      relations: { features: true },
      order: { position: 'ASC' },
    });
  }

  async findOne(id: number) {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: { features: true },
    });
    if (!plan) throw new NotFoundException(`Plan #${id} not found`);
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.planRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Já existe um plano com o nome "${dto.name}"`);
    const plan = this.planRepository.create(dto);
    return this.planRepository.save(plan);
  }

  async update(id: number, dto: UpdatePlanDto) {
    const plan = await this.findOne(id);
    if (dto.name && dto.name !== plan.name) {
      const existing = await this.planRepository.findOne({ where: { name: dto.name } });
      if (existing) throw new ConflictException(`Já existe um plano com o nome "${dto.name}"`);
    }
    Object.assign(plan, dto);
    return this.planRepository.save(plan);
  }

  async remove(id: number) {
    const plan = await this.findOne(id);
    await this.planRepository.remove(plan);
    return { message: `Plano #${id} removido com sucesso` };
  }
}
