import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '../../shared';
import { DomainError } from '../../common/domain-error';
import { PERMISSIONS_KEY, type AuthUser } from '../auth/decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<{ authUser?: AuthUser }>();
    const user = req.authUser;
    if (!user) throw DomainError.unauthorized();

    const granted = new Set(user.permissions);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      throw DomainError.forbidden(`Faltam permissões: ${missing.join(', ')}.`);
    }
    return true;
  }
}
