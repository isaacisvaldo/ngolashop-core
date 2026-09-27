import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Autentica se houver token válido, mas deixa passar pedidos anónimos (user = undefined). */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return user;
  }
}
