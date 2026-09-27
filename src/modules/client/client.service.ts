import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { AdminUpdateClientDto } from './dto/admin-update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async findAll(page = 1, limit = 10, search?: string, status?: string) {
    const qb = this.clientRepository
      .createQueryBuilder('c')
      .select(['c.id', 'c.name', 'c.email', 'c.phone', 'c.province', 'c.city', 'c.isActive', 'c.createdAt'])
      .orderBy('c.createdAt', 'DESC');
    if (search) {
      qb.andWhere('(c.name ILIKE :s OR c.email ILIKE :s OR c.phone ILIKE :s OR c.province ILIKE :s)', { s: `%${search}%` });
    }
    if (status === 'active') qb.andWhere('c.isActive = true');
    if (status === 'suspended') qb.andWhere('c.isActive = false');

    const [clients, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    const ids = clients.map((c) => c.id);
    const stats = ids.length
      ? await this.clientRepository.manager.query(
          `SELECT client_id AS "clientId", COUNT(*) AS orders,
                  COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0) AS spent
             FROM tb_orders WHERE deleted_at IS NULL AND client_id = ANY($1) GROUP BY client_id`,
          [ids],
        ) as { clientId: number; orders: string; spent: string }[]
      : [];
    const statMap = new Map(stats.map((s) => [Number(s.clientId), s]));

    const totals = await this.clientRepository
      .createQueryBuilder('c')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE c.is_active)', 'active')
      .getRawOne<{ total: string; active: string }>();
    const volume = await this.clientRepository.manager.query(
      `SELECT COALESCE(SUM(total), 0) AS v FROM tb_orders WHERE deleted_at IS NULL AND client_id IS NOT NULL AND status <> 'cancelled'`,
    ) as { v: string }[];

    return {
      data: clients.map((c) => ({
        ...c,
        ordersCount: Number(statMap.get(c.id)?.orders ?? 0),
        totalSpent: Number(statMap.get(c.id)?.spent ?? 0),
      })),
      summary: {
        total: Number(totals?.total ?? 0),
        active: Number(totals?.active ?? 0),
        suspended: Number(totals?.total ?? 0) - Number(totals?.active ?? 0),
        volume: Number(volume[0]?.v ?? 0),
      },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    const { password: _, refreshToken: __, ...result } = client as any;
    return result;
  }

  async update(id: number, dto: AdminUpdateClientDto) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    Object.assign(client, dto);
    const saved = await this.clientRepository.save(client);
    const { password: _, refreshToken: __, ...result } = saved as any;
    return result;
  }

  async remove(id: number) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    await this.clientRepository.softRemove(client);
    return { message: `Client #${id} removido com sucesso` };
  }
}
