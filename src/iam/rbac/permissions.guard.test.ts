import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../auth/decorators';
import { DomainError } from '../../common/domain-error';

function ctx(authUser: unknown, required?: string[]) {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);
  const handler = () => undefined;
  if (required) Reflect.defineMetadata(PERMISSIONS_KEY, required, handler);
  const execCtx = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ authUser }) }),
  } as never;
  return { guard, execCtx };
}

describe('PermissionsGuard', () => {
  it('libera quando a rota não exige permissão', () => {
    const { guard, execCtx } = ctx({ permissions: [] });
    expect(guard.canActivate(execCtx)).toBe(true);
  });

  it('libera quando o usuário tem todas as permissões exigidas', () => {
    const { guard, execCtx } = ctx({ permissions: ['route:read', 'route:update'] }, [
      'route:update',
    ]);
    expect(guard.canActivate(execCtx)).toBe(true);
  });

  it('bloqueia (403) quando falta permissão', () => {
    const { guard, execCtx } = ctx({ permissions: ['route:read'] }, ['route:update']);
    try {
      guard.canActivate(execCtx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).status).toBe(403);
    }
  });

  it('exige autenticação quando não há authUser', () => {
    const { guard, execCtx } = ctx(undefined, ['route:read']);
    expect(() => guard.canActivate(execCtx)).toThrow(DomainError);
  });
});
