import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { TenantContext } from './tenant-context';

/**
 * Abre um contexto (AsyncLocalStorage) por requisição com um requestId.
 * O tenantId/userId começam nulos e são preenchidos pelo JwtAuthGuard depois
 * de validar o token. Rotas públicas seguem com contexto "vazio".
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    res.setHeader('x-request-id', requestId);

    TenantContext.run({ requestId, tenantId: null, userId: null, isPlatformStaff: false }, () =>
      next(),
    );
  }
}
