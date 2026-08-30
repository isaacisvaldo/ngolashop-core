import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Permission } from '../shared/permission/entities/permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(
    page = 1,
    limit = 50,
  ): Promise<{
    data: Permission[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await this.permissionRepository.findAndCount({
      where: { slug: Not('system.full-access') },
      skip: (page - 1) * limit,
      take: limit,
      order: { module: 'ASC', slug: 'ASC' },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findSiglas(): Promise<string[]> {
    const permissions = await this.permissionRepository.find({
      order: { slug: 'ASC' },
    });
    return permissions.map((p) => p.slug);
  }
}
