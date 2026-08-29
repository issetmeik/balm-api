import { Injectable } from '@nestjs/common';
import { tenantSettings, type TenantResponse, type TenantSettings } from '@coldchain/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DomainError } from '../../common/domain-error';
import { AuditService } from '../../audit/audit.service';
import { TenantContext } from '../tenant-context/tenant-context';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async current(): Promise<TenantResponse> {
    const id = TenantContext.requireTenantId();
    const t = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!t) throw DomainError.notFound('Empresa');
    return this.toResponse(t);
  }

  async updateSettings(input: unknown): Promise<TenantResponse> {
    const id = TenantContext.requireTenantId();
    const before = await this.prisma.tenant.findUnique({ where: { id } });
    if (!before) throw DomainError.notFound('Empresa');

    const parsed = tenantSettings.parse((input as { settings?: unknown })?.settings ?? {});
    const merged: TenantSettings = { ...(before.settings as TenantSettings), ...parsed };

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { settings: merged as never },
      include: { plan: true },
    });
    await this.audit.record({
      action: 'tenant.settings.updated',
      entityType: 'Tenant',
      entityId: id,
      before: before.settings,
      after: merged,
    });
    return this.toResponse(updated);
  }

  private toResponse(t: {
    id: string;
    slug: string;
    name: string;
    cnpj: string | null;
    status: string;
    settings: unknown;
    trialEndsAt: Date | null;
    createdAt: Date;
    plan: { slug: string; name: string };
  }): TenantResponse {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      cnpj: t.cnpj,
      status: t.status,
      settings: (t.settings ?? {}) as TenantSettings,
      plan: { slug: t.plan.slug, name: t.plan.name },
      trialEndsAt: t.trialEndsAt ? t.trialEndsAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
