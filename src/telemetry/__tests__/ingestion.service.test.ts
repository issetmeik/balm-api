import { describe, it, expect, vi } from 'vitest';
import type { IngestTelemetryBody } from '@coldchain/shared';
import { IngestionService } from '../ingestion.service';
import { TenantContext } from '../../iam/tenant-context/tenant-context';

const TENANT = '00000000-0000-0000-0000-000000000001';

function serviceWith(createMany: ReturnType<typeof vi.fn>) {
  const prisma = { telemetryReading: { createMany } } as never;
  return new IngestionService(prisma);
}

function run<T>(fn: () => Promise<T>): Promise<T> {
  return TenantContext.run(
    { requestId: 'r', tenantId: TENANT, userId: 'u', isPlatformStaff: false },
    fn,
  );
}

function reading(dedupeKey: string, over: Partial<IngestTelemetryBody['readings'][number]> = {}) {
  return {
    recordedAt: new Date().toISOString(),
    temperatureC: 4.5,
    dedupeKey,
    ...over,
  };
}

describe('IngestionService', () => {
  it('grava leituras válidas e reporta accepted/duplicates', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const svc = serviceWith(createMany);

    const res = await run(() =>
      svc.ingest(
        { deviceSerial: 'SN-1', readings: [reading('a'), reading('b'), reading('c')] },
        'user-1',
      ),
    );

    expect(res).toEqual({ accepted: 2, duplicates: 1, rejected: [] });
    const data = createMany.mock.calls[0]![0].data;
    expect(data).toHaveLength(3);
    expect(data[0]).toMatchObject({
      tenantId: TENANT,
      deviceSerial: 'SN-1',
      ingestedByUserId: 'user-1',
    });
    expect(createMany.mock.calls[0]![0].skipDuplicates).toBe(true);
  });

  it('rejeita recordedAt fora de ±48h, sem chamar o banco se sobrar nada', async () => {
    const createMany = vi.fn();
    const svc = serviceWith(createMany);

    const res = await run(() =>
      svc.ingest(
        {
          deviceSerial: 'SN-1',
          readings: [reading('old', { recordedAt: '2020-01-01T00:00:00.000Z' })],
        },
        null,
      ),
    );

    expect(res.accepted).toBe(0);
    expect(res.rejected).toEqual([{ dedupeKey: 'old', reason: 'recordedAt fora de ±48h' }]);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('deduplica dedupeKey repetido dentro do mesmo lote', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const svc = serviceWith(createMany);

    const res = await run(() =>
      svc.ingest({ deviceSerial: 'SN-1', readings: [reading('x'), reading('x')] }, null),
    );

    expect(res.rejected).toEqual([{ dedupeKey: 'x', reason: 'dedupeKey repetido no lote' }]);
    expect(createMany.mock.calls[0]![0].data).toHaveLength(1);
  });

  it('sem contexto de tenant → lança', async () => {
    const svc = serviceWith(vi.fn());
    await expect(
      svc.ingest({ deviceSerial: 'SN-1', readings: [reading('a')] }, null),
    ).rejects.toThrow(/tenant/i);
  });
});
