import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../decorators/current-user.decorator';
import { AdminService } from '../admin.service';
import { REQUIRED_PERMISSIONS_KEY } from './constants';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private adminService: AdminService,
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

    const adminUser = await this.adminService.findById(user.sub);

    if (!adminUser || !adminUser.isActive) {
      throw new ForbiddenException('Account disabled');
    }

    if (adminUser.isRoot || !requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const granted = new Set(await this.adminService.getPermissionSlugs(adminUser));
    // Uma permissão de escrita implica a respectiva leitura (ex.: order.write → order.read)
    const allowed = requiredPermissions.some(
      (p) => granted.has(p) || (p.endsWith('.read') && granted.has(p.replace(/\.read$/, '.write'))),
    );

    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
