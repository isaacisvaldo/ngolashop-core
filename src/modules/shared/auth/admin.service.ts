import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AdminUserPermission } from './entities/admin-user-permission.entity';
import { RolePermission } from '../role/entities/role-permission.entity';
import { Permission } from '../permission/entities/permission.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AdminUserPermission)
    private readonly adminUserPermissionRepository: Repository<AdminUserPermission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findById(id: number) {
    return this.adminUserRepository.findOne({ where: { id } });
  }

  async isActive(id: number) {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    return user?.isActive ?? false;
  }

  async hasRole(id: number) {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    return user?.roleId != null;
  }

  /**
   * Permissões efectivas de um administrador: as permissões individuais
   * (quando existem) sobrepõem-se às permissões herdadas do perfil.
   */
  async getPermissionSlugs(adminUser: AdminUser): Promise<string[]> {
    if (adminUser.isRoot) return ['system.full-access'];

    let permissionIds = (
      await this.adminUserPermissionRepository.find({ where: { adminUserId: adminUser.id } })
    ).map((p) => p.permissionId);

    if (permissionIds.length === 0 && adminUser.roleId) {
      permissionIds = (
        await this.rolePermissionRepository.find({ where: { roleId: adminUser.roleId } })
      ).map((p) => p.permissionId);
    }

    if (permissionIds.length === 0) return [];
    const permissions = await this.permissionRepository.find({ where: { id: In(permissionIds) } });
    return permissions.map((p) => p.slug);
  }
}
