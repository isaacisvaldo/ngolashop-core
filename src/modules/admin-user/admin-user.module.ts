import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { AdminUser } from '../shared/auth/entities/admin-user.entity';
import { AdminUserPermission } from '../shared/auth/entities/admin-user-permission.entity';
import { Role } from '../shared/role/entities/role.entity';
import { RolePermission } from '../shared/role/entities/role-permission.entity';
import { Permission } from '../shared/permission/entities/permission.entity';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      AdminUserPermission,
      Role,
      RolePermission,
      Permission,
    ]),
    AuthModule,
  ],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
