import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Permission } from '../permission/entities/permission.entity';
import { AdminUser } from '../auth/entities/admin-user.entity';
import { AdminUserPermission } from '../auth/entities/admin-user-permission.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, Permission, AdminUser, AdminUserPermission]), AuthModule],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
