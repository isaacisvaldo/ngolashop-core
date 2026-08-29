import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
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

    return savedRole;
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{
    data: Role[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await this.roleRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
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

    return role;
  }

  async remove(id: number): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    await this.rolePermissionRepository.delete({ roleId: id });
    await this.roleRepository.softRemove(role);
  }
}
