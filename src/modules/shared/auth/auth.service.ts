import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LoginDto, UserType } from './dto/login.dto';
import { RegisterStoreDto } from './dto/register-store.dto';
import { User } from './entities/user.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Store } from '../../store/entities/store.entity';
import { Plan } from '../plan/entities/plan.entity';
import { StoreSubscription } from '../../subscription/entities/subscription.entity';
import { JwtPayload } from './decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(StoreSubscription)
    private readonly subscriptionRepository: Repository<StoreSubscription>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const { email, password, userType } = dto;

    if (userType === UserType.ADMIN) {
      return this.loginAdmin(email, password);
    }
    return this.loginStore(email, password);
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
    // Try store users first
    const storeUser = await this.userRepository.findOne({
      where: { refreshToken },
    });
    if (storeUser) {
      const payload: JwtPayload = {
        sub: storeUser.id,
        email: storeUser.email,
        type: 'store',
        storeId: storeUser.storeId,
        rootAdmin: storeUser.rootAdmin,
      };
      const accessToken = await this.generateToken(payload, 15);
      const newRefreshToken = this.generateRefreshToken();
      await this.userRepository.update(storeUser.id, {
        refreshToken: newRefreshToken,
      });
      return { accessToken, refreshToken: newRefreshToken };
    }

    // Try admin users
    const adminUser = await this.adminUserRepository.findOne({
      where: { refreshToken },
    });
    if (adminUser) {
      const payload: JwtPayload = {
        sub: adminUser.id,
        email: adminUser.email,
        type: 'admin',
        rootAdmin: adminUser.isRoot,
        roleId: adminUser.roleId,
      };
      const accessToken = await this.generateToken(payload, 15);
      const newRefreshToken = this.generateRefreshToken();
      await this.adminUserRepository.update(adminUser.id, {
        refreshToken: newRefreshToken,
      });
      return { accessToken, refreshToken: newRefreshToken };
    }

    throw new UnauthorizedException('Invalid refresh token');
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
