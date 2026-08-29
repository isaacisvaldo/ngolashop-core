import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../decorators/current-user.decorator';
import { REQUIRED_PERMISSIONS_KEY } from './constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    // Root admin bypasses all permission checks
    if (user.type === 'admin' && user.rootAdmin) {
      return true;
    }

    // For store users, check rootAdmin flag (root admin of store has full access)
    if (user.type === 'store' && user.rootAdmin) {
      return true;
    }

    // TODO: For non-root users, check their assigned permissions
    // against requiredPermissions. This requires a user_permissions
    // or role_permissions lookup. For now, deny access.
    throw new ForbiddenException('Insufficient permissions');
  }
}
