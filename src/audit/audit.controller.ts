import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RequirePermissions } from '../iam/auth/decorators';
import { TenantContext } from '../iam/tenant-context/tenant-context';

@ApiTags('audit')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit:read')
  async list(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit = '50',
  ) {
    const tenantId = TenantContext.requireTenantId();
    const take = Math.min(Number(limit) || 50, 100);
    const rows = await this.prisma.auditLog.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { at: 'desc' },
      take,
    });
    return {
      data: rows.map((r) => ({ ...r, id: r.id.toString() })),
      nextCursor: null,
    };
  }
}
