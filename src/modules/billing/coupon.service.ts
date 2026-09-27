import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { CouponDto } from './dto/billing.dto';
import { BillingService } from './billing.service';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon) private readonly couponRepository: Repository<Coupon>,
    private readonly billing: BillingService,
  ) {}

  list(storeId: number) {
    return this.couponRepository.find({ where: { storeId }, order: { createdAt: 'DESC' } });
  }

  private normalize(dto: CouponDto) {
    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new BadRequestException('Código inválido: use 3 a 40 letras, números, - ou _');
    if (dto.type === 'percent' && dto.value > 90) throw new BadRequestException('O desconto percentual máximo é 90%');
    if (dto.startsAt && dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('A data de fim tem de ser depois da data de início');
    }
    return {
      code,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxUses: dto.maxUses ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      isActive: dto.isActive ?? true,
    };
  }

  async create(storeId: number, dto: CouponDto) {
    await this.billing.assertFeature(storeId, 'allowsCoupons', 'Cupões de desconto');
    const data = this.normalize(dto);
    const exists = await this.couponRepository
      .createQueryBuilder('c')
      .where('c.store_id = :storeId AND UPPER(c.code) = :code', { storeId, code: data.code })
      .getExists();
    if (exists) throw new ConflictException('Já existe um cupão com este código');
    return this.couponRepository.save(this.couponRepository.create({ ...data, storeId }));
  }

  async update(storeId: number, id: number, dto: CouponDto) {
    await this.billing.assertFeature(storeId, 'allowsCoupons', 'Cupões de desconto');
    const coupon = await this.couponRepository.findOne({ where: { id, storeId } });
    if (!coupon) throw new NotFoundException('Cupão não encontrado');
    Object.assign(coupon, this.normalize(dto));
    return this.couponRepository.save(coupon);
  }

  async remove(storeId: number, id: number) {
    const coupon = await this.couponRepository.findOne({ where: { id, storeId } });
    if (!coupon) throw new NotFoundException('Cupão não encontrado');
    await this.couponRepository.softRemove(coupon);
    return { message: 'Cupão removido' };
  }

  /** Valida o cupão para um subtotal e devolve o desconto (não consome o cupão). */
  async evaluate(storeId: number, code: string, subtotal: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Coupon) : this.couponRepository;
    const coupon = await repo
      .createQueryBuilder('c')
      .where('c.store_id = :storeId AND UPPER(c.code) = :code', { storeId, code: code.trim().toUpperCase() })
      .getOne();
    const now = new Date();
    if (!coupon || !coupon.isActive) throw new BadRequestException('Cupão inválido');
    const { allowsCoupons } = await this.billing.features(storeId);
    if (!allowsCoupons) throw new BadRequestException('Esta loja não tem cupões ativos de momento');
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('Este cupão ainda não está ativo');
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestException('Este cupão expirou');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Este cupão já atingiu o limite de utilizações');
    if (coupon.minOrderAmount !== null && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Este cupão exige compras a partir de ${Number(coupon.minOrderAmount).toLocaleString('pt-PT')} Kz`);
    }
    const raw = coupon.type === 'percent' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
    const discount = Math.min(Math.round(raw), subtotal);
    return { coupon, discount };
  }

  /** Consome uma utilização de forma atómica (usado dentro da transação do pedido). */
  async consume(manager: EntityManager, couponId: number) {
    const r = await manager
      .createQueryBuilder()
      .update(Coupon)
      .set({ usedCount: () => 'used_count + 1' })
      .where('id = :id AND (max_uses IS NULL OR used_count < max_uses)', { id: couponId })
      .execute();
    if (!r.affected) throw new BadRequestException('Este cupão já atingiu o limite de utilizações');
  }
}
