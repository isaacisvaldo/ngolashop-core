import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from './entities/user.entity';
import { AdminUser } from './entities/admin-user.entity';
import { Client } from '../../client/entities/client.entity';
import { Store } from '../../store/entities/store.entity';
import { Plan } from '../plan/entities/plan.entity';
import { StoreSubscription } from '../../subscription/entities/subscription.entity';
import { Role } from '../role/entities/role.entity';
import { RolePermission } from '../role/entities/role-permission.entity';
import { Permission } from '../permission/entities/permission.entity';
import { Order } from '../../order/entities/order.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AdminUser,
      Client,
      Store,
      Plan,
      StoreSubscription,
      Role,
      RolePermission,
      Permission,
      Order,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, PermissionsGuard, AdminGuard, AdminService],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard, AdminGuard, AdminService],
})
export class AuthModule {}
