import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../decorators/current-user.decorator';
import { AdminUser } from '../entities/admin-user.entity';
import { REQUIRED_PERMISSIONS_KEY } from './constants';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.type !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    if (user.rootAdmin) {
      return true;
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const adminUser = await this.adminUserRepository.findOne({
      where: { id: user.sub },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new ForbiddenException('Account disabled');
    }

    if (adminUser.roleId) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
