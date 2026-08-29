import { Injectable } from '@nestjs/common';
import type { Permission } from '../../shared';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface ResolvedAccess {
  roles: string[];
  permissions: Permission[];
}

/**
 * Resolve os papéis e permissões efetivas de um usuário (server-side, não no
 * token — remoção de permissão vale já na próxima requisição). Ver ADR-0003.
 * Cache curto em memória; trocar por Redis quando houver múltiplas instâncias.
 */
@Injectable()
export class RbacService {
  private cache = new Map<string, { at: number; value: ResolvedAccess }>();
  private readonly ttlMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  async resolve(userId: string, tenantId: string | null): Promise<ResolvedAccess> {
    const key = `${userId}:${tenantId ?? 'platform'}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value;

    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        userId,
        tenantId: tenantId ?? null,
      },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const roles = new Set<string>();
    const permissions = new Set<string>();
    for (const a of assignments) {
      roles.add(a.role.key);
      for (const rp of a.role.permissions) permissions.add(rp.permission.key);
    }

    const value: ResolvedAccess = {
      roles: [...roles],
      permissions: [...permissions] as Permission[],
    };
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }
}
