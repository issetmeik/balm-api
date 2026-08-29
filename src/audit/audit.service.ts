import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service';
import { TenantContext } from '../iam/tenant-context/tenant-context';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  tenantId?: string | null;
  actorUserId?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    const ctx = TenantContext.get();
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId ?? ctx?.tenantId ?? null,
          actorUserId: entry.actorUserId ?? ctx?.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: (entry.before ?? undefined) as never,
          after: (entry.after ?? undefined) as never,
        },
      });
    } catch (err) {
      // auditoria nunca deve derrubar a operação principal
      this.logger.error({ err, entry }, 'Falha ao gravar AuditLog');
    }
  }
}
