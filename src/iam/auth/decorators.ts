import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@coldchain/shared';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...perms: Permission[]) => SetMetadata(PERMISSIONS_KEY, perms);

/** Marca uma rota como exclusiva de staff de plataforma. */
export const PLATFORM_ONLY = 'platformOnly';
export const PlatformOnly = () => SetMetadata(PLATFORM_ONLY, true);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  isPlatformStaff: boolean;
  roles: string[];
  permissions: Permission[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.authUser;
    return data && user ? user[data] : user;
  },
);
