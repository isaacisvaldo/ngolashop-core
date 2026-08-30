import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { Permission } from '../shared/permission/entities/permission.entity';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission]),
    AuthModule,
  ],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
