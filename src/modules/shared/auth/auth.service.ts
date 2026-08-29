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
import { JwtPayload } from './decorators/current-user.decorator';

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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(payload, 15),
      this.generateRefreshToken(),
    ]);

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

    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(payload, 15),
      this.generateRefreshToken(),
    ]);

    await this.userRepository.update(user.id, { refreshToken });

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
    };
  }

  async registerStore(dto: RegisterStoreDto) {
    const exists = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Default to free plan
    const freePlan = await this.planRepository.findOne({
      where: { name: 'Grátis' },
    });

    const slug = this.slugify(dto.storeName);

    const store = this.storeRepository.create({
      name: dto.storeName,
      slug,
      whatsapp: dto.phone,
      planId: freePlan?.id ?? null,
    });
    const savedStore = await this.storeRepository.save(store);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      storeId: savedStore.id,
      rootAdmin: true,
    });
    const savedUser = await this.userRepository.save(user);

    // Update store with userId
    savedStore.userId = savedUser.id;
    await this.storeRepository.save(savedStore);

    const payload: JwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      type: 'store',
      storeId: savedStore.id,
      rootAdmin: true,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(payload, 15),
      this.generateRefreshToken(),
    ]);

    await this.userRepository.update(savedUser.id, { refreshToken });

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
      const [accessToken, newRefreshToken] = await Promise.all([
        this.generateToken(payload, 15),
        this.generateRefreshToken(),
      ]);
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
      const [accessToken, newRefreshToken] = await Promise.all([
        this.generateToken(payload, 15),
        this.generateRefreshToken(),
      ]);
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

  private async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(64).toString('hex');
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
