import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Permission } from '../permission/entities/permission.entity';
import { AdminUser } from '../auth/entities/admin-user.entity';
import { AdminUserPermission } from '../auth/entities/admin-user-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AdminUserPermission)
    private readonly adminUserPermissionRepository: Repository<AdminUserPermission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role & { permissions?: Permission[] }> {
    const role = this.roleRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description,
    });
    const savedRole = await this.roleRepository.save(role);

    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      const rolePermissions = createRoleDto.permissionIds.map((permissionId) =>
        this.rolePermissionRepository.create({
          roleId: savedRole.id,
          permissionId,
        }),
      );
      await this.rolePermissionRepository.save(rolePermissions);
    }

    const rolePermissions = await this.rolePermissionRepository.find({ where: { roleId: savedRole.id } });
    let permissions: Permission[] = [];
    if (rolePermissions.length > 0) {
      const permissionIds = rolePermissions.map((rp) => rp.permissionId);
      permissions = await this.permissionRepository.find({ where: permissionIds.map((pid) => ({ id: pid })) });
    }

    return { ...savedRole, permissions };
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{
    data: (Role & { permissions?: Permission[] })[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await this.roleRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const rolesWithPermissions = await Promise.all(
      data.map(async (role) => {
        const rolePermissions = await this.rolePermissionRepository.find({
          where: { roleId: role.id },
        });
        if (rolePermissions.length === 0) return { ...role, permissions: [] };
        const permissionIds = rolePermissions.map((rp) => rp.permissionId);
        const permissions = await this.permissionRepository.find({
          where: permissionIds.map((id) => ({ id })),
        });
        return { ...role, permissions };
      }),
    );

    return {
      data: rolesWithPermissions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Role & { permissions?: Permission[] }> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId: id },
    });
    let permissions: Permission[] = [];
    if (rolePermissions.length > 0) {
      const permissionIds = rolePermissions.map((rp) => rp.permissionId);
      permissions = await this.permissionRepository.find({
        where: permissionIds.map((id) => ({ id })),
      });
    }

    return { ...role, permissions };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role & { permissions?: Permission[] }> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (updateRoleDto.name !== undefined) {
      role.name = updateRoleDto.name;
    }
    if (updateRoleDto.description !== undefined) {
      role.description = updateRoleDto.description;
    }

    await this.roleRepository.save(role);

    if (updateRoleDto.permissionIds !== undefined) {
      await this.rolePermissionRepository.delete({ roleId: id });
      if (updateRoleDto.permissionIds.length > 0) {
        const rolePermissions = updateRoleDto.permissionIds.map(
          (permissionId) =>
            this.rolePermissionRepository.create({ roleId: id, permissionId }),
        );
        await this.rolePermissionRepository.save(rolePermissions);
      }
    }

    const rolePermissions = await this.rolePermissionRepository.find({ where: { roleId: id } });
    let permissions: Permission[] = [];
    if (rolePermissions.length > 0) {
      const permissionIds = rolePermissions.map((rp) => rp.permissionId);
      permissions = await this.permissionRepository.find({ where: permissionIds.map((pid) => ({ id: pid })) });
    }

    return { ...role, permissions };
  }

  async remove(id: number): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    await this.rolePermissionRepository.delete({ roleId: id });
    await this.roleRepository.softRemove(role);
  }

  async applyPermissions(id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId: id },
    });
    const permissionIds = rolePermissions.map((rp) => rp.permissionId);

    const usersWithRole = await this.adminUserRepository.find({
      where: { roleId: id },
    });

    let usuariosAtualizados = 0;
    for (const user of usersWithRole) {
      await this.adminUserPermissionRepository.delete({ adminUserId: user.id });
      if (permissionIds.length > 0) {
        const entities = permissionIds.map((permissionId) =>
          this.adminUserPermissionRepository.create({
            adminUserId: user.id,
            permissionId,
          }),
        );
        await this.adminUserPermissionRepository.save(entities);
      }
      usuariosAtualizados++;
    }

    return {
      role: { id: role.id, name: role.name },
      usuariosAtualizados,
    };
  }
}
