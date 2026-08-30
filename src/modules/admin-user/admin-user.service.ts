import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../shared/auth/entities/admin-user.entity';
import { AdminUserPermission } from '../shared/auth/entities/admin-user-permission.entity';
import { Role } from '../shared/role/entities/role.entity';
import { RolePermission } from '../shared/role/entities/role-permission.entity';
import { Permission } from '../shared/permission/entities/permission.entity';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AdminUserPermission)
    private readonly adminUserPermissionRepository: Repository<AdminUserPermission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(dto: CreateAdminUserDto): Promise<AdminUser> {
    const existing = await this.adminUserRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const adminUser = this.adminUserRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      roleId: dto.roleId,
      isRoot: dto.isRoot ?? false,
    });
    const saved = await this.adminUserRepository.save(adminUser);

    if (saved.roleId) {
      const rolePerms = await this.rolePermissionRepository.find({ where: { roleId: saved.roleId } });
      if (rolePerms.length > 0) {
        const entities = rolePerms.map((rp) =>
          this.adminUserPermissionRepository.create({
            adminUserId: saved.id,
            permissionId: rp.permissionId,
          }),
        );
        await this.adminUserPermissionRepository.save(entities);
      }
    }

    return saved;
  }

  async findAll(
    page = 1,
    limit = 10,
    search = '',
  ): Promise<{
    data: AdminUser[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qb = this.adminUserRepository.createQueryBuilder('admin');

    qb.select([
      'admin.id',
      'admin.name',
      'admin.email',
      'admin.phone',
      'admin.isActive',
      'admin.isRoot',
      'admin.roleId',
      'admin.createdAt',
    ]);

    if (search) {
      qb.where(
        '(admin.name ILIKE :search OR admin.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('admin.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        isRoot: true,
        roleId: true,
        createdAt: true,
      },
    });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${id} not found`);
    }
    return adminUser;
  }

  async findOneWithPermissions(id: number) {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        isRoot: true,
        roleId: true,
        createdAt: true,
      },
    });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${id} not found`);
    }

    let permissions: string[] = [];
    let role: { id: number; name: string } | null = null;

    if (adminUser.roleId) {
      const roleEntity = await this.roleRepository.findOne({
        where: { id: adminUser.roleId },
      });
      if (roleEntity) {
        role = { id: roleEntity.id, name: roleEntity.name };
      }

      const rolePermissions = await this.rolePermissionRepository.find({
        where: { roleId: adminUser.roleId },
      });

      if (rolePermissions.length > 0) {
        const permissionIds = rolePermissions.map((rp) => rp.permissionId);
        const permissionEntities = await this.permissionRepository.find({
          where: permissionIds.map((id) => ({ id })),
        });
        permissions = permissionEntities.map((p) => p.slug);
      }
    }

    if (adminUser.isRoot) {
      permissions = ['system.full-access'];
    }

    return {
      ...adminUser,
      role,
      permissions,
    };
  }

  async update(id: number, dto: UpdateAdminUserDto): Promise<AdminUser> {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
    });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${id} not found`);
    }

    if (dto.email && dto.email !== adminUser.email) {
      const existing = await this.adminUserRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(adminUser, dto);
    return this.adminUserRepository.save(adminUser);
  }

  async remove(id: number): Promise<void> {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id },
    });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${id} not found`);
    }
    if (adminUser.isRoot) {
      throw new BadRequestException('Cannot delete root admin user');
    }
    await this.adminUserPermissionRepository.delete({ adminUserId: id });
    await this.adminUserRepository.softRemove(adminUser);
  }

  async getUserPermissions(id: number) {
    const adminUser = await this.adminUserRepository.findOne({ where: { id } });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${id} not found`);
    }

    const allPermissions = await this.permissionRepository.find({
      where: { slug: Not('system.full-access') },
      order: { slug: 'ASC' },
    });
    const userPerms = await this.adminUserPermissionRepository.find({ where: { adminUserId: id } });

    let activePermIds: Set<number>;

    if (userPerms.length > 0) {
      activePermIds = new Set(userPerms.map((up) => up.permissionId));
    } else if (adminUser.roleId) {
      const rolePerms = await this.rolePermissionRepository.find({ where: { roleId: adminUser.roleId } });
      activePermIds = new Set(rolePerms.map((rp) => rp.permissionId));
    } else {
      activePermIds = new Set();
    }

    if (adminUser.isRoot) {
      activePermIds = new Set(allPermissions.map((p) => p.id));
    }

    const groups = new Map<string, { id: number; name: string; description: string; sigla: string; active: boolean }[]>();
    for (const perm of allPermissions) {
      const categoria = perm.slug.split('.')[0] || 'outros';
      if (!groups.has(categoria)) groups.set(categoria, []);
      groups.get(categoria)!.push({
        id: perm.id,
        name: perm.slug,
        description: perm.description,
        sigla: perm.slug,
        active: activePermIds.has(perm.id),
      });
    }

    const grupos = [...groups.entries()].map(([categoria, permissions]) => ({
      categoria,
      permissions,
    }));

    return {
      grupos,
      total: allPermissions.length,
      totalActivas: activePermIds.size,
    };
  }

  async updateUserPermissions(id: number, permissionIds: number[]) {
    const adminUser = await this.adminUserRepository.findOne({ where: { id } });
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${id} not found`);
    }

    await this.adminUserPermissionRepository.delete({ adminUserId: id });

    if (permissionIds.length > 0) {
      const entities = permissionIds.map((permissionId) =>
        this.adminUserPermissionRepository.create({
          adminUserId: id,
          permissionId,
        }),
      );
      await this.adminUserPermissionRepository.save(entities);
    }

    return { success: true, updated: permissionIds.length };
  }
}
