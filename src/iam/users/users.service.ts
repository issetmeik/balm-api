import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  type CreateUserBody,
  type RoleResponse,
  type UpdateUserBody,
  type UserResponse,
} from '@coldchain/shared';
import { Prisma, PrismaService } from '../../infra/prisma/prisma.service';
import { DomainError } from '../../common/domain-error';
import { AuditService } from '../../audit/audit.service';
import { LimitsService } from '../limits/limits.service';
import { RbacService } from '../rbac/rbac.service';
import { TenantContext } from '../tenant-context/tenant-context';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly limits: LimitsService,
    private readonly rbac: RbacService,
  ) {}

  async list(): Promise<UserResponse[]> {
    const users = await this.prisma.scoped.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: { roleAssignments: { include: { role: true } } },
    });
    return users.map((u) => this.toResponse(u));
  }

  async create(body: CreateUserBody): Promise<UserResponse> {
    const tenantId = TenantContext.requireTenantId();
    await this.limits.assertWithinLimit('maxUsers');

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: body.email } },
    });
    if (existing) throw DomainError.conflict('Já existe um usuário com este e-mail nesta empresa.');

    const roles = await this.resolveRoles(tenantId, body.roleKeys);
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: body.email,
        name: body.name,
        phone: body.phone ?? null,
        passwordHash,
        status: 'ACTIVE',
        roleAssignments: {
          create: roles.map((r) => ({ roleId: r.id, tenantId })),
        },
      },
      include: { roleAssignments: { include: { role: true } } },
    });

    await this.audit.record({
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, roles: body.roleKeys },
    });
    return this.toResponse(user);
  }

  async update(id: string, body: UpdateUserBody): Promise<UserResponse> {
    const user = await this.getScopedUserOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone === undefined ? undefined : body.phone,
        status: body.status ?? undefined,
      },
      include: { roleAssignments: { include: { role: true } } },
    });
    this.rbac.invalidate(user.id);
    await this.audit.record({
      action: 'user.updated',
      entityType: 'User',
      entityId: user.id,
      before: { name: user.name, status: user.status },
      after: body,
    });
    return this.toResponse(updated);
  }

  async setRoles(id: string, roleKeys: string[]): Promise<UserResponse> {
    const tenantId = TenantContext.requireTenantId();
    const user = await this.getScopedUserOrThrow(id);
    const roles = await this.resolveRoles(tenantId, roleKeys);

    await this.prisma.$transaction([
      this.prisma.roleAssignment.deleteMany({ where: { userId: user.id, tenantId } }),
      this.prisma.roleAssignment.createMany({
        data: roles.map((r) => ({ userId: user.id, roleId: r.id, tenantId })),
      }),
    ]);
    this.rbac.invalidate(user.id);

    await this.audit.record({
      action: 'user.roles.set',
      entityType: 'User',
      entityId: user.id,
      after: { roles: roleKeys },
    });
    return this.toResponse(await this.getUserWithRoles(user.id));
  }

  async listRoles(): Promise<RoleResponse[]> {
    const tenantId = TenantContext.requireTenantId();
    const roles = await this.prisma.role.findMany({
      where: { OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
      include: { permissions: { include: { permission: true } } },
      orderBy: { key: 'asc' },
    });
    return roles
      .filter((r) => r.key !== 'PLATFORM_ADMIN')
      .map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        isSystem: r.isSystem,
        permissions: r.permissions.map((p) => p.permission.key),
      }));
  }

  // ---- internos ----

  private async resolveRoles(tenantId: string, keys: string[]) {
    const roles = await this.prisma.role.findMany({
      where: {
        key: { in: keys },
        OR: [{ tenantId }, { tenantId: null, isSystem: true }],
      },
    });
    const found = new Set(roles.map((r) => r.key));
    const missing = keys.filter((k) => !found.has(k));
    if (missing.length) throw DomainError.validation(`Papéis inexistentes: ${missing.join(', ')}.`);
    if (roles.some((r) => r.key === 'PLATFORM_ADMIN')) {
      throw DomainError.forbidden('Não é possível atribuir o papel de plataforma.');
    }
    return roles;
  }

  private async getScopedUserOrThrow(id: string) {
    const user = await this.prisma.scoped.user.findFirst({ where: { id } });
    if (!user) throw DomainError.notFound('Usuário');
    return user;
  }

  private async getUserWithRoles(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { roleAssignments: { include: { role: true } } },
    });
    if (!u) throw DomainError.notFound('Usuário');
    return u;
  }

  private toResponse(u: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    status: string;
    mfaEnabled: boolean;
    createdAt: Date;
    roleAssignments: { role: { key: string } }[];
  }): UserResponse {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      roles: u.roleAssignments.map((ra) => ra.role.key),
      createdAt: u.createdAt.toISOString(),
    };
  }
}

export { Prisma };
