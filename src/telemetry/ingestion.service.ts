import { Injectable, Logger } from '@nestjs/common';
import {
  TELEMETRY_CLOCK_SKEW_HOURS,
  type IngestTelemetryBody,
  type IngestTelemetryResponse,
} from '@coldchain/shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { TenantContext } from '../iam/tenant-context/tenant-context';

/**
 * Fatia mínima da ingestão (Fase 4): valida janela de tempo, deduplica no lote,
 * grava com `skipDuplicates` (idempotente por `dedupeKey`). Sem fila, sem worker,
 * sem agregados — isso entra na Fase 4 completa. Ver ADR-0004.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly skewMs = TELEMETRY_CLOCK_SKEW_HOURS * 3_600_000;

  constructor(private readonly prisma: PrismaService) {}

  async ingest(
    body: IngestTelemetryBody,
    ingestedByUserId: string | null,
  ): Promise<IngestTelemetryResponse> {
    const tenantId = TenantContext.requireTenantId();
    const now = Date.now();

    const rejected: { dedupeKey: string; reason: string }[] = [];
    const seen = new Set<string>();
    const valid = body.readings.filter((r) => {
      const recordedAtMs = Date.parse(r.recordedAt);
      if (Number.isNaN(recordedAtMs) || Math.abs(now - recordedAtMs) > this.skewMs) {
        rejected.push({ dedupeKey: r.dedupeKey, reason: 'recordedAt fora de ±48h' });
        return false;
      }
      if (seen.has(r.dedupeKey)) {
        rejected.push({ dedupeKey: r.dedupeKey, reason: 'dedupeKey repetido no lote' });
        return false;
      }
      seen.add(r.dedupeKey);
      return true;
    });

    if (valid.length === 0) {
      return { accepted: 0, duplicates: 0, rejected };
    }

    // INSERT com tenantId explícito (do contexto já validado pelo guard);
    // dedup idempotente por (tenantId, deviceSerial, dedupeKey).
    const { count } = await this.prisma.telemetryReading.createMany({
      data: valid.map((r) => ({
        tenantId,
        deviceSerial: body.deviceSerial,
        thermalBoxCode: body.thermalBoxCode ?? null,
        temperatureC: r.temperatureC ?? null,
        humidityPct: r.humidityPct ?? null,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        batteryPct: r.batteryPct ?? null,
        batteryMv: r.batteryMv ?? null,
        recordedAt: new Date(r.recordedAt),
        dedupeKey: r.dedupeKey,
        ingestedByUserId,
        extra: (r.extra ?? undefined) as never,
      })),
      skipDuplicates: true,
    });

    const duplicates = valid.length - count;
    this.logger.log(
      { tenantId, deviceSerial: body.deviceSerial, accepted: count, duplicates },
      'telemetria ingerida',
    );
    return { accepted: count, duplicates, rejected };
  }
}
