import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LoginDto, UserType } from './dto/login.dto';
import { RegisterStoreDto } from './dto/register-store.dto';
import { User } from './entities/user.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Client } from '../../client/entities/client.entity';
import { Store } from '../../store/entities/store.entity';
import { Plan } from '../plan/entities/plan.entity';
import { StoreSubscription } from '../../subscription/entities/subscription.entity';
import { Role } from '../role/entities/role.entity';
import { RolePermission } from '../role/entities/role-permission.entity';
import { Permission } from '../permission/entities/permission.entity';
import { JwtPayload } from './decorators/current-user.decorator';
import { EmailService } from '../email/email.service';
import { Order } from '../../order/entities/order.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(StoreSubscription)
    private readonly subscriptionRepository: Repository<StoreSubscription>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const { email, password, userType } = dto;

    if (userType === UserType.ADMIN) {
      return this.loginAdmin(email, password);
    }
    if (userType === UserType.CLIENT) {
      return this.loginClient(email, password);
    }
    return this.loginStore(email, password);
  }

  private async loginClient(email: string, password: string) {
    const client = await this.clientRepository.findOne({ where: { email } });
    if (!client) throw new UnauthorizedException('Credenciais inválidas');
    if (!client.isActive) throw new UnauthorizedException('Conta desativada');

    const valid = await bcrypt.compare(password, client.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload: JwtPayload = {
      sub: client.id,
      email: client.email,
      type: 'client',
    };

    const accessToken = await this.generateToken(payload, 15);
    const refreshToken = this.generateRefreshToken();

    await this.clientRepository.update(client.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
        type: 'client' as const,
      },
    };
  }

  async registerClient(dto: { name: string; email: string; password: string; phone: string; province?: string; city?: string; address?: string }) {
    const existsEmail = await this.clientRepository.findOne({ where: { email: dto.email } });
    if (existsEmail) throw new ConflictException('Email já está em uso');

    const existsPhone = await this.clientRepository.findOne({ where: { phone: dto.phone } });
    if (existsPhone) throw new ConflictException('Telefone já está em uso');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const client = this.clientRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      province: dto.province,
      city: dto.city,
      address: dto.address,
    });

    const saved = await this.clientRepository.save(client);

    const payload: JwtPayload = {
      sub: saved.id,
      email: saved.email,
      type: 'client',
    };

    const accessToken = await this.generateToken(payload, 15);
    const refreshToken = this.generateRefreshToken();

    await this.clientRepository.update(saved.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        type: 'client' as const,
      },
    };
  }

  private async loginAdmin(email: string, password: string) {
    const user = await this.adminUserRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'admin',
      rootAdmin: user.isRoot,
      roleId: user.roleId,
    };

    const accessToken = await this.generateToken(payload, 15);
    const refreshToken = this.generateRefreshToken();

    await this.adminUserRepository.update(user.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: 'admin' as const,
        isRoot: user.isRoot,
      },
    };
  }

  private async loginStore(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'store',
      storeId: user.storeId,
      rootAdmin: user.rootAdmin,
    };

    const accessToken = await this.generateToken(payload, 15);
    const refreshToken = this.generateRefreshToken();

    await this.userRepository.update(user.id, { refreshToken });

    // Get active subscription
    const now = new Date();
    const subscription = await this.subscriptionRepository.findOne({
      where: { store: { id: user.storeId! }, status: 'active' },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });

    const isExpired = subscription?.endDate && subscription.endDate < now;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: 'store' as const,
        storeId: user.storeId,
        rootAdmin: user.rootAdmin,
      },
      subscription:
        subscription && !isExpired
          ? {
              id: subscription.id,
              plan: subscription.plan,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              status: subscription.status,
            }
          : null,
    };
  }

  async registerStore(dto: RegisterStoreDto) {
    const exists = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already in use');
    }

    const phoneExists = await this.userRepository.findOne({
      where: { phone: dto.phone },
    });
    if (phoneExists) {
      throw new ConflictException('Phone number already in use');
    }

    const slug = this.slugify(dto.storeName);
    const existingSlug = await this.storeRepository.findOne({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException('A store with this name already exists');
    }

    // Resolve plan: use provided planId or default to free plan
    let plan: Plan | null = null;
    if (dto.planId) {
      plan = await this.planRepository.findOne({
        where: { id: dto.planId, isActive: true },
      });
      if (!plan) {
        throw new ConflictException('Invalid or inactive plan');
      }
    } else {
      plan = await this.planRepository.findOne({
        where: { name: 'Grátis' },
      });
    }

    // Generate random password
    const generatedPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const store = this.storeRepository.create({
      name: dto.storeName,
      slug,
      whatsapp: dto.phone,
      ...(dto.categoryId && { categoryId: dto.categoryId }),
      ...(dto.logoUrl && { logoUrl: dto.logoUrl }),
    });
    const savedStore = await this.storeRepository.save(store);

    const user = this.userRepository.create({
      name: dto.storeName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      storeId: savedStore.id,
      rootAdmin: true,
    });
    const savedUser = await this.userRepository.save(user);

    // Create subscription to selected plan (1 month from now)
    if (plan) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const sub = this.subscriptionRepository.create({
        store: savedStore,
        plan,
        startDate: now,
        endDate,
        status: 'active',
      });
      await this.subscriptionRepository.save(sub);
    }

    const payload: JwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      type: 'store',
      storeId: savedStore.id,
      rootAdmin: true,
    };

    const accessToken = await this.generateToken(payload, 15);
    const refreshToken = this.generateRefreshToken();

    await this.userRepository.update(savedUser.id, { refreshToken });

    await this.emailService.sendStoreCredentials(
      dto.email,
      dto.storeName,
      dto.storeName,
      dto.email,
      generatedPassword,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        type: 'store' as const,
        storeId: savedStore.id,
        rootAdmin: true,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    // Try client users
    const client = await this.clientRepository.findOne({ where: { refreshToken } });
    if (client) {
      const payload: JwtPayload = { sub: client.id, email: client.email, type: 'client' };
      const accessToken = await this.generateToken(payload, 15);
      const newRefreshToken = this.generateRefreshToken();
      await this.clientRepository.update(client.id, { refreshToken: newRefreshToken });
      return { accessToken, refreshToken: newRefreshToken };
    }

    // Try store users
    const storeUser = await this.userRepository.findOne({ where: { refreshToken } });
    if (storeUser) {
      const payload: JwtPayload = { sub: storeUser.id, email: storeUser.email, type: 'store', storeId: storeUser.storeId, rootAdmin: storeUser.rootAdmin };
      const accessToken = await this.generateToken(payload, 15);
      const newRefreshToken = this.generateRefreshToken();
      await this.userRepository.update(storeUser.id, { refreshToken: newRefreshToken });
      return { accessToken, refreshToken: newRefreshToken };
    }

    // Try admin users
    const adminUser = await this.adminUserRepository.findOne({ where: { refreshToken } });
    if (adminUser) {
      const payload: JwtPayload = { sub: adminUser.id, email: adminUser.email, type: 'admin', rootAdmin: adminUser.isRoot, roleId: adminUser.roleId };
      const accessToken = await this.generateToken(payload, 15);
      const newRefreshToken = this.generateRefreshToken();
      await this.adminUserRepository.update(adminUser.id, { refreshToken: newRefreshToken });
      return { accessToken, refreshToken: newRefreshToken };
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async getMe(userId: number, userType: 'admin' | 'store' | 'client') {
    if (userType === 'admin') {
      return this.getAdminMe(userId);
    }
    if (userType === 'client') {
      return this.getClientMe(userId);
    }
    return this.getStoreMe(userId);
  }

  private async getAdminMe(userId: number) {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id: userId },
    });
    if (!adminUser) {
      throw new UnauthorizedException('User not found');
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
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      isActive: adminUser.isActive,
      isRoot: adminUser.isRoot,
      role,
      permissions,
    };
  }

  private async getStoreMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      rootAdmin: user.rootAdmin,
      storeId: user.storeId,
    };
  }

  private async getClientMe(userId: number) {
    const client = await this.clientRepository.findOne({ where: { id: userId } });
    if (!client) throw new UnauthorizedException('User not found');

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      province: client.province,
      city: client.city,
      address: client.address,
      avatarUrl: client.avatarUrl,
      isActive: client.isActive,
      createdAt: client.createdAt,
      type: 'client' as const,
    };
  }

  async getClientStats(userId: number) {
    const client = await this.clientRepository.findOne({ where: { id: userId } });
    if (!client) throw new UnauthorizedException('User not found');

    const orders = await this.orderRepository.find({
      where: { clientId: userId },
      order: { createdAt: 'DESC' },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = orders.filter((o) => new Date(o.createdAt) >= startOfMonth);
    const monthSpent = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const recentOrders = orders.slice(0, 5).map((o) => ({
      id: o.id,
      total: Number(o.total),
      status: o.status,
      trackingCode: o.trackingCode,
      createdAt: o.createdAt,
    }));

    return {
      totalOrders,
      totalSpent,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      monthOrders: monthOrders.length,
      monthSpent,
      recentOrders,
    };
  }

  async logout(userId: number, userType: 'admin' | 'store' | 'client') {
    if (userType === 'admin') {
      await this.adminUserRepository.update(userId, { refreshToken: null });
    } else if (userType === 'client') {
      await this.clientRepository.update(userId, { refreshToken: null });
    } else {
      await this.userRepository.update(userId, { refreshToken: null });
    }
    return { message: 'Logged out successfully' };
  }

  async updateMe(userId: number, userType: 'admin' | 'store' | 'client', data: { name?: string; phone?: string }) {
    if (userType === 'admin') {
      const user = await this.adminUserRepository.findOne({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('User not found');
      if (data.name !== undefined) user.name = data.name;
      if (data.phone !== undefined) user.phone = data.phone;
      await this.adminUserRepository.save(user);
      return this.getAdminMe(userId);
    }
    if (userType === 'client') {
      const client = await this.clientRepository.findOne({ where: { id: userId } });
      if (!client) throw new UnauthorizedException('User not found');
      if (data.name !== undefined) client.name = data.name;
      if (data.phone !== undefined) client.phone = data.phone;
      await this.clientRepository.save(client);
      return this.getClientMe(userId);
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;
    await this.userRepository.save(user);
    return this.getStoreMe(userId);
  }

  async changePassword(userId: number, userType: 'admin' | 'store' | 'client', currentPassword: string, newPassword: string) {
    if (userType === 'admin') {
      const user = await this.adminUserRepository.findOne({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('User not found');
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) throw new BadRequestException('Palavra-passe atual incorreta');
      user.password = await bcrypt.hash(newPassword, 10);
      await this.adminUserRepository.save(user);
      return { message: 'Palavra-passe alterada com sucesso' };
    }
    if (userType === 'client') {
      const client = await this.clientRepository.findOne({ where: { id: userId } });
      if (!client) throw new UnauthorizedException('User not found');
      const valid = await bcrypt.compare(currentPassword, client.password);
      if (!valid) throw new BadRequestException('Palavra-passe atual incorreta');
      client.password = await bcrypt.hash(newPassword, 10);
      await this.clientRepository.save(client);
      return { message: 'Palavra-passe alterada com sucesso' };
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Palavra-passe atual incorreta');
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
    return { message: 'Palavra-passe alterada com sucesso' };
  }

  private async generateToken(
    payload: JwtPayload,
    expiresInMinutes: number,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: `${expiresInMinutes}m`,
    });
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private generatePassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const chars = upper + lower + digits;
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 3; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
