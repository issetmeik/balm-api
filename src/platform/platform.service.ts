import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  canTransition,
  TENANT_TRANSITIONS,
  type CreateTenantBody,
  type TenantStatus,
} from '../shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { DomainError } from '../common/domain-error';
import { AuditService } from '../audit/audit.service';

/**
 * Operações de PLATAFORMA — fora do escopo de tenant, usando o client bruto
 * (this.prisma.<model>), sempre auditadas. Ver ADR-0002.
 */
@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: { plan: true, _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: tenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        status: t.status,
        plan: t.plan.slug,
        users: t._count.users,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async createTenant(body: CreateTenantBody) {
    const plan = await this.prisma.plan.findUnique({ where: { slug: body.planSlug } });
    if (!plan) throw DomainError.validation(`Plano "${body.planSlug}" não existe.`);

    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (slugTaken) throw DomainError.conflict(`O identificador "${body.slug}" já está em uso.`);

    const adminRole = await this.prisma.role.findFirst({
      where: { key: 'TENANT_ADMIN', tenantId: null, isSystem: true },
    });
    if (!adminRole) {
      throw DomainError.conflict(
        'Papéis-semente ausentes. Rode o seed (pnpm seed).',
      );
    }

    const passwordHash = await argon2.hash(body.admin.password, { type: argon2.argon2id });

    const tenant = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          slug: body.slug,
          name: body.name,
          cnpj: body.cnpj ?? null,
          planId: plan.id,
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        },
      });
      await tx.user.create({
        data: {
          tenantId: t.id,
          email: body.admin.email,
          name: body.admin.name,
          passwordHash,
          status: 'ACTIVE',
          roleAssignments: { create: [{ roleId: adminRole.id, tenantId: t.id }] },
        },
      });
      return t;
    });

    await this.audit.record({
      action: 'platform.tenant.created',
      entityType: 'Tenant',
      entityId: tenant.id,
      tenantId: tenant.id,
      after: { slug: tenant.slug, plan: plan.slug, admin: body.admin.email },
    });

    return { id: tenant.id, slug: tenant.slug, name: tenant.name, status: tenant.status };
  }

  async updateTenant(id: string, patch: { status?: TenantStatus; planSlug?: string }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, include: { plan: true } });
    if (!tenant) throw DomainError.notFound('Empresa');

    const data: { status?: TenantStatus; planId?: string } = {};

    if (patch.status && patch.status !== tenant.status) {
      if (!canTransition(TENANT_TRANSITIONS, tenant.status as TenantStatus, patch.status)) {
        throw DomainError.conflict(
          `Transição de status ${tenant.status} → ${patch.status} não é permitida.`,
        );
      }
      data.status = patch.status;
    }

    if (patch.planSlug && patch.planSlug !== tenant.plan.slug) {
      const plan = await this.prisma.plan.findUnique({ where: { slug: patch.planSlug } });
      if (!plan) throw DomainError.validation(`Plano "${patch.planSlug}" não existe.`);
      data.planId = plan.id;
    }

    if (Object.keys(data).length === 0) return { id, unchanged: true };

    const updated = await this.prisma.tenant.update({
      where: { id },
      data,
      include: { plan: true },
    });
    await this.audit.record({
      action: 'platform.tenant.updated',
      entityType: 'Tenant',
      entityId: id,
      tenantId: id,
      before: { status: tenant.status, plan: tenant.plan.slug },
      after: { status: updated.status, plan: updated.plan.slug },
    });
    return { id, status: updated.status, plan: updated.plan.slug };
  }
}
