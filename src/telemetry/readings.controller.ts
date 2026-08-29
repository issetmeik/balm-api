import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RecentTelemetryResponse, TelemetryReadingRow } from '../shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RequirePermissions } from '../iam/auth/decorators';
import { TenantContext } from '../iam/tenant-context/tenant-context';

@ApiTags('telemetry')
@Controller({ path: 'telemetry', version: '1' })
export class ReadingsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Leituras mais recentes do tenant — conferência rápida da ingestão. */
  @Get('recent')
  @RequirePermissions('telemetry:read')
  async recent(
    @Query('deviceSerial') deviceSerial?: string,
    @Query('limit') limit = '50',
  ): Promise<RecentTelemetryResponse> {
    TenantContext.requireTenantId();
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const rows = await this.prisma.scoped.telemetryReading.findMany({
      where: deviceSerial ? { deviceSerial } : {},
      orderBy: { receivedAt: 'desc' },
      take,
    });

    return { data: rows.map(toRow), nextCursor: null };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(r: any): TelemetryReadingRow {
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  return {
    id: String(r.id),
    deviceSerial: r.deviceSerial,
    thermalBoxCode: r.thermalBoxCode ?? null,
    temperatureC: num(r.temperatureC),
    humidityPct: num(r.humidityPct),
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    batteryPct: r.batteryPct ?? null,
    batteryMv: r.batteryMv ?? null,
    recordedAt: r.recordedAt.toISOString(),
    receivedAt: r.receivedAt.toISOString(),
    extra: r.extra ?? null,
  };
}
