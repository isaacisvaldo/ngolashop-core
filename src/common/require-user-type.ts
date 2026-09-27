import { ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../modules/shared/auth/decorators/current-user.decorator';

/** Garante que o token pertence ao tipo de conta esperado (cliente, loja ou admin). */
export function requireUserType(user: JwtPayload | undefined, ...types: JwtPayload['type'][]) {
  if (!user || !types.includes(user.type)) {
    throw new ForbiddenException('Operação não permitida para este tipo de conta');
  }
  return user;
}

export function paginate<T>(data: T[], total: number, page: number, limit: number) {
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
