import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly repository: Repository<PaymentMethod>,
  ) {}

  async create(dto: CreatePaymentMethodDto) {
    const exists = await this.repository.findOne({ where: { slug: dto.slug } });
    if (exists) {
      throw new ConflictException(
        `Payment method with slug "${dto.slug}" already exists`,
      );
    }
    const method = this.repository.create(dto);
    return this.repository.save(method);
  }

  async findAll(page = 1, limit = 10, activeOnly = false) {
    const qb = this.repository.createQueryBuilder('pm');
    if (activeOnly) {
      qb.where('pm.is_active = :active', { active: true });
    }
    qb.orderBy('pm.position', 'ASC').addOrderBy('pm.name', 'ASC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllActive() {
    return this.repository.find({
      where: { isActive: true },
      order: { position: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const method = await this.repository.findOne({ where: { id } });
    if (!method) throw new NotFoundException(`Payment method #${id} not found`);
    return method;
  }

  async update(id: number, dto: UpdatePaymentMethodDto) {
    const method = await this.findOne(id);

    if (dto.slug && dto.slug !== method.slug) {
      const exists = await this.repository.findOne({
        where: { slug: dto.slug },
      });
      if (exists) {
        throw new ConflictException(
          `Payment method with slug "${dto.slug}" already exists`,
        );
      }
    }

    Object.assign(method, dto);
    return this.repository.save(method);
  }

  async remove(id: number) {
    const method = await this.findOne(id);
    await this.repository.softRemove(method);
  }
}
