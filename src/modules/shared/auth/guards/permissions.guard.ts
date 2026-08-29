import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../decorators/current-user.decorator';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

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

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new UnauthorizedException();
    }

    // Admin root has full access
    if (user.type === 'admin' && user.rootAdmin) {
      return true;
    }

    // TODO: check user.permissions against requiredPermissions
    // For now, allow if authenticated
    return true;
  }
}
