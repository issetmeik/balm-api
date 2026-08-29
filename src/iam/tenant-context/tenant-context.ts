import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  /** Tenant da requisição. null = fluxo de plataforma / auth / público. */
  tenantId: string | null;
  userId: string | null;
  isPlatformStaff: boolean;
}

const als = new AsyncLocalStorage<RequestContext>();

export const TenantContext = {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return als.run(ctx, fn);
  },
  get(): RequestContext | undefined {
    return als.getStore();
  },
  /** tenantId obrigatório — lança se estamos fora de um contexto de tenant. */
  requireTenantId(): string {
    const ctx = als.getStore();
    if (!ctx?.tenantId) {
      throw new Error('Operação exige contexto de tenant, mas nenhum foi resolvido na requisição.');
    }
    return ctx.tenantId;
  },
  tenantId(): string | null {
    return als.getStore()?.tenantId ?? null;
  },
};
