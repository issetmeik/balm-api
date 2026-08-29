import { z } from 'zod';

/**
 * Contrato de ingestão de telemetria. Ver ADR-0004 e docs/06.
 * Usado pelo app do motorista (Fase 8) e pelo endpoint da API (Fase 4).
 * O DTO de rede é declarado aqui — a entidade de domínio de cada lado
 * (ex.: `EyeSensorReading` no mobile) é convertida para este formato antes do envio.
 */

export const telemetryReadingInput = z.object({
  /** Relógio do dispositivo/coletor (ISO 8601). */
  recordedAt: z.string().datetime(),
  temperatureC: z.number().min(-80).max(150).optional(),
  humidityPct: z.number().min(0).max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  batteryPct: z.number().int().min(0).max(100).optional(),
  batteryMv: z.number().int().min(0).max(6000).optional(),
  /** Chave de deduplicação estável por leitura (ex.: "<serial>:<epoch>"). */
  dedupeKey: z.string().min(1).max(120),
  /** Campos extras do sensor que a API pode ignorar sem quebrar o contrato. */
  extra: z.record(z.unknown()).optional(),
});
export type TelemetryReadingInput = z.infer<typeof telemetryReadingInput>;

export const ingestTelemetryBody = z.object({
  /** Serial do dispositivo que produziu as leituras. */
  deviceSerial: z.string().min(1),
  /** Opcional: QR/código da caixa lido em campo, quando o vínculo não é do backend. */
  thermalBoxCode: z.string().optional(),
  readings: z.array(telemetryReadingInput).min(1).max(500),
});
export type IngestTelemetryBody = z.infer<typeof ingestTelemetryBody>;

export const ingestTelemetryResponse = z.object({
  accepted: z.number().int(),
  duplicates: z.number().int(),
  rejected: z.array(z.object({ dedupeKey: z.string(), reason: z.string() })),
});
export type IngestTelemetryResponse = z.infer<typeof ingestTelemetryResponse>;

/** Item de leitura já persistida, para telas de conferência. */
export const telemetryReadingRow = z.object({
  id: z.string(),
  deviceSerial: z.string(),
  thermalBoxCode: z.string().nullable(),
  temperatureC: z.number().nullable(),
  humidityPct: z.number().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  batteryPct: z.number().nullable(),
  batteryMv: z.number().nullable(),
  recordedAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  extra: z.record(z.unknown()).nullable(),
});
export type TelemetryReadingRow = z.infer<typeof telemetryReadingRow>;

export const recentTelemetryResponse = z.object({
  data: z.array(telemetryReadingRow),
  nextCursor: z.string().nullable(),
});
export type RecentTelemetryResponse = z.infer<typeof recentTelemetryResponse>;

export const MAX_READINGS_PER_BATCH = 500;
export const TELEMETRY_CLOCK_SKEW_HOURS = 48;
