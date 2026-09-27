import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { JwtPayload } from '../shared/auth/decorators/current-user.decorator';

const METHOD_ACTION: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

const SENSITIVE_KEYS = /password|token|secret/i;

/** Regista automaticamente todas as operações de escrita feitas por administradores. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const action = METHOD_ACTION[request.method];
    const user = request.user;

    if (!action || !user || user.type !== 'admin') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const segments = request.path
          .split('/')
          .filter((s) => s && s !== 'api' && s !== 'admin');
        const entity = segments[0] ?? 'desconhecido';
        const entityId = segments.find((s) => /^\d+$/.test(s)) ?? null;
        const sub = segments.slice(1).filter((s) => !/^\d+$/.test(s)).join('/');

        this.auditService
          .record({
            adminUserId: user.sub,
            actorEmail: user.email,
            action: sub ? `${action}:${sub}` : action,
            entity,
            entityId,
            path: `${request.method} ${request.originalUrl}`.slice(0, 255),
            details: this.sanitize(request.body),
            ip: (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip || null,
          })
          .catch((err: Error) => this.logger.error(`Falha ao gravar auditoria: ${err.message}`));
      }),
    );
  }

  private sanitize(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const entries = Object.entries(body as Record<string, unknown>).filter(([k]) => !SENSITIVE_KEYS.test(k));
    return entries.length ? Object.fromEntries(entries) : null;
  }
}
