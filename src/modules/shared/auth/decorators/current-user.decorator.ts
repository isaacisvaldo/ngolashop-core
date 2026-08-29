import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  type: 'admin' | 'store';
  storeId?: number | null;
  rootAdmin?: boolean;
  roleId?: number | null;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | number | boolean | null | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
