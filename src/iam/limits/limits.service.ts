import { Injectable } from '@nestjs/common';
import type { PlanLimitKey, UsageResponse } from '../../shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DomainError } from '../../common/domain-error';
import { TenantContext } from '../tenant-context/tenant-context';

/**
 * Checagem de limites de plano (billing-ready). Chamado na CRIAÇÃO de recursos.
 * Fase 9 adiciona cobrança e medição de volume; a checagem quantitativa já é aqui.
 */
@Injectable()
export class LimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertWithinLimit(key: PlanLimitKey, tenantId?: string): Promise<void> {
    const tid = tenantId ?? TenantContext.requireTenantId();
    const limit = await this.limitValue(tid, key);
    if (limit === null) return; // ilimitado ou não definido
    const used = await this.count(key, tid);
    if (used >= limit) {
      throw DomainError.planLimit(
        `Seu plano permite ${limit} (${key}). Faça upgrade para adicionar mais.`,
      );
    }
  }

  async usage(tenantId: string): Promise<UsageResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: { include: { limits: true } } },
    });
    if (!tenant) throw DomainError.notFound('Empresa');

    const limits = await Promise.all(
      tenant.plan.limits.map(async (l) => ({
        key: l.key as PlanLimitKey,
        limit: l.value,
        used: await this.count(l.key as PlanLimitKey, tenantId).catch(() => 0),
      })),
    );
    return { limits };
  }

  private async limitValue(tenantId: string, key: PlanLimitKey): Promise<number | null> {
    const row = await this.prisma.planLimit.findFirst({
      where: { key, plan: { tenants: { some: { id: tenantId } } } },
    });
    return row?.value ?? null;
  }

  private async count(key: PlanLimitKey, tenantId: string): Promise<number> {
    switch (key) {
      case 'maxUsers':
        return this.prisma.user.count({ where: { tenantId } });
      // Fases 2+ preenchem os demais contadores:
      case 'maxDrivers':
      case 'maxVehicles':
      case 'maxThermalBoxes':
      case 'maxDevices':
      case 'maxActiveRoutes':
        return 0;
      default:
        return 0;
    }
  }
}
