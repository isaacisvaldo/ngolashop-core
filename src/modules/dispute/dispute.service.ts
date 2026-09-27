import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Dispute } from './entities/dispute.entity';
import { CreateDisputeDto, UpdateDisputeDto } from './dto/dispute.dto';
import { Order } from '../order/entities/order.entity';
import { SettingService } from '../setting/setting.service';
import { paginate } from '../../common/require-user-type';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute) private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    private readonly settingService: SettingService,
  ) {}

  async create(clientId: number, dto: CreateDisputeDto) {
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId, clientId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status === 'cancelled') {
      throw new BadRequestException('Não é possível abrir disputa num pedido cancelado');
    }
    if (order.status === 'delivered') {
      const windowDays = await this.settingService.getNumber('dispute_window_days', 14);
      const limit = new Date(order.updatedAt);
      limit.setDate(limit.getDate() + windowDays);
      if (limit < new Date()) {
        throw new BadRequestException(`O prazo de ${windowDays} dias para abrir disputa já terminou`);
      }
    }
    const existing = await this.disputeRepository.findOne({
      where: { orderId: order.id, status: In(['open', 'in_review']) },
    });
    if (existing) throw new BadRequestException('Já existe uma disputa em curso para este pedido');

    return this.disputeRepository.save(
      this.disputeRepository.create({
        orderId: order.id,
        storeId: order.storeId,
        clientId,
        reason: dto.reason.trim(),
        description: dto.description?.trim() || null,
        amount: Number(order.total),
        status: 'open',
      }),
    );
  }

  findByClient(clientId: number) {
    return this.disputeRepository.find({
      where: { clientId },
      relations: { store: true, order: true },
      order: { createdAt: 'DESC' },
    });
  }

  findByStore(storeId: number) {
    return this.disputeRepository.find({
      where: { storeId },
      relations: { client: true, order: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAdmin(page = 1, limit = 20, status?: string, search?: string) {
    const qb = this.disputeRepository
      .createQueryBuilder('d')
      .leftJoin('d.store', 'store')
      .addSelect(['store.id', 'store.name'])
      .leftJoin('d.client', 'client')
      .addSelect(['client.id', 'client.name', 'client.email', 'client.phone'])
      .leftJoin('d.order', 'o')
      .addSelect(['o.id', 'o.customerName', 'o.status', 'o.total'])
      .orderBy('d.createdAt', 'DESC');
    if (status) qb.andWhere('d.status = :status', { status });
    if (search) {
      qb.andWhere(
        '(d.reason ILIKE :s OR store.name ILIKE :s OR client.name ILIKE :s OR o.customerName ILIKE :s OR CAST(d.order_id AS TEXT) = :raw)',
        { s: `%${search}%`, raw: search.replace(/\D/g, '') || '-1' },
      );
    }
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const stats = await this.disputeRepository
      .createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(d.amount), 0)', 'amount')
      .groupBy('d.status')
      .getRawMany<{ status: string; count: string; amount: string }>();
    return {
      ...paginate(data, total, page, limit),
      stats: Object.fromEntries(stats.map((r) => [r.status, { count: Number(r.count), amount: Number(r.amount) }])),
    };
  }

  async update(id: number, dto: UpdateDisputeDto, adminId: number) {
    const dispute = await this.disputeRepository.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException(`Disputa #${id} não encontrada`);
    const closing = dto.status === 'resolved' || dto.status === 'rejected';
    if (closing && !dto.resolution?.trim() && !dispute.resolution) {
      throw new BadRequestException('Indique a decisão tomada para encerrar a disputa');
    }
    dispute.status = dto.status;
    if (dto.resolution !== undefined) dispute.resolution = dto.resolution.trim() || null;
    dispute.resolvedBy = closing ? adminId : null;
    dispute.resolvedAt = closing ? new Date() : null;
    return this.disputeRepository.save(dispute);
  }
}
