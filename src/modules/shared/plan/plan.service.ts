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
    const { features, ...data } = dto;
    const plan = await this.planRepository.save(this.planRepository.create(data));
    if (features) await this.replaceFeatures(plan.id, features);
    return this.findOne(plan.id);
  }

  async update(id: number, dto: UpdatePlanDto) {
    const plan = await this.findOne(id);
    if (dto.name && dto.name !== plan.name) {
      const existing = await this.planRepository.findOne({ where: { name: dto.name } });
      if (existing) throw new ConflictException(`Já existe um plano com o nome "${dto.name}"`);
    }
    const { features, ...data } = dto;
    await this.planRepository.update(id, data);
    if (features) await this.replaceFeatures(id, features);
    return this.findOne(plan.id);
  }

  private async replaceFeatures(planId: number, features: { text: string; included: boolean }[]) {
    await this.featureRepository.delete({ plan: { id: planId } });
    await this.featureRepository.save(
      features
        .filter((f) => f.text.trim())
        .map((f, i) => this.featureRepository.create({ plan: { id: planId }, text: f.text.trim(), isIncluded: f.included, position: i + 1 })),
    );
  }

  async remove(id: number) {
    const plan = await this.findOne(id);
    const inUse = (await this.planRepository.manager.query(
      `SELECT (SELECT COUNT(*) FROM tb_store_subscriptions WHERE plan_id = $1) + (SELECT COUNT(*) FROM tb_subscription_invoices WHERE plan_id = $1) AS n`,
      [id],
    )) as { n: string }[];
    if (Number(inUse[0]?.n ?? 0) > 0 || plan.slug === 'gratis') {
      throw new ConflictException('Este plano tem lojas ou faturas associadas. Desative-o em vez de o eliminar.');
    }
    await this.featureRepository.delete({ plan: { id } });
    await this.planRepository.remove(plan);
    return { message: `Plano #${id} removido com sucesso` };
  }
}
