import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DomainError } from '../../common/domain-error';
import { TenantContext } from '../tenant-context/tenant-context';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { TokensService } from './tokens.service';
import { IS_PUBLIC, PLATFORM_ONLY, type AuthUser } from './decorators';

const ADMIN_ROLES = new Set(['TENANT_ADMIN', 'PLATFORM_ADMIN']);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { authUser?: AuthUser }>();
    const token = extractBearer(req.headers.authorization);
    if (!token) throw DomainError.unauthorized('Token de acesso ausente.');

    let claims;
    try {
      claims = await this.tokens.verifyAccess(token);
    } catch {
      throw DomainError.unauthorized('Token de acesso inválido ou expirado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: { tenant: { include: { plan: true } } },
    });
    if (!user || user.status === 'DISABLED') {
      throw DomainError.unauthorized('Usuário inativo.');
    }

    const { roles, permissions } = await this.rbac.resolve(user.id, user.tenantId);

    if (user.tenantId && user.tenant) {
      const inactive = user.tenant.status === 'SUSPENDED' || user.tenant.status === 'CANCELED';
      const isAdmin = roles.some((r) => ADMIN_ROLES.has(r));
      if (inactive && !isAdmin) {
        throw DomainError.tenantInactive();
      }
    }

    const platformOnly = this.reflector.getAllAndOverride<boolean>(PLATFORM_ONLY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (platformOnly && !user.isPlatformStaff) {
      throw DomainError.forbidden('Endpoint exclusivo da plataforma.');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      isPlatformStaff: user.isPlatformStaff,
      roles,
      permissions,
    };
    req.authUser = authUser;

    // Preenche o contexto da requisição (aberto pelo middleware).
    const store = TenantContext.get();
    if (store) {
      store.tenantId = user.tenantId;
      store.userId = user.id;
      store.isPlatformStaff = user.isPlatformStaff;
    }

    return true;
  }
}

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}
