import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AdminUser } from '../shared/auth/entities/admin-user.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async record(entry: Partial<AuditLog>) {
    if (entry.adminUserId && !entry.actorName) {
      const admin = await this.adminUserRepository.findOne({ where: { id: entry.adminUserId }, withDeleted: true });
      entry.actorName = admin?.name ?? null;
    }
    await this.auditRepository.save(this.auditRepository.create(entry));
  }

  async findAll(page = 1, limit = 20, search?: string, entity?: string) {
    const qb = this.auditRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (entity) qb.andWhere('log.entity = :entity', { entity });
    if (search) {
      qb.andWhere(
        '(log.actorName ILIKE :s OR log.actorEmail ILIKE :s OR log.path ILIKE :s OR log.entityId = :raw)',
        { s: `%${search}%`, raw: search },
      );
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const entities = await this.auditRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.entity', 'entity')
      .orderBy('entity')
      .getRawMany<{ entity: string }>();

    return {
      data,
      entities: entities.map((e) => e.entity),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
