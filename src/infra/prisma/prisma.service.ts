import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContext } from '../../iam/tenant-context/tenant-context';

/**
 * Modelos cujo acesso é SEMPRE escopado pelo tenant da requisição.
 * Manter em sincronia com o schema: todo model com coluna `tenantId`.
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  'User',
  'Role',
  'RoleAssignment',
  'RefreshToken',
  'AuditLog',
  'TelemetryReading',
]);

const READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);
const WHERE_OPS = new Set([...READ_OPS, 'updateMany', 'deleteMany', 'update', 'delete']);

interface TenantQueryArgs {
  model?: string;
  operation: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
}

function tenantExtension(client: PrismaClient) {
  return client.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: TenantQueryArgs) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args);

          const tenantId = TenantContext.tenantId();
          if (!tenantId) {
            throw new Error(
              `Acesso a ${model}.${operation} sem contexto de tenant. ` +
                `Use PrismaService.global explicitamente em fluxos de plataforma.`,
            );
          }

          // findUnique não aceita filtro por campo não-único → vira findFirst.
          if (operation === 'findUnique') operation = 'findFirst';
          if (operation === 'findUniqueOrThrow') operation = 'findFirstOrThrow';

          const next = { ...args };

          if (WHERE_OPS.has(operation)) {
            next.where = { ...(next.where ?? {}), tenantId };
          }
          if (operation === 'create') {
            next.data = { ...(next.data ?? {}), tenantId };
          }
          if (operation === 'createMany') {
            const data = Array.isArray(next.data) ? next.data : [next.data];
            next.data = data.map((d: Record<string, unknown>) => ({ ...d, tenantId }));
          }
          if (operation === 'upsert') {
            next.where = { ...(next.where ?? {}), tenantId };
            next.create = { ...(next.create ?? {}), tenantId };
          }

          return query(next);
        },
      },
    },
  });
}

export type ScopedPrisma = ReturnType<typeof tenantExtension>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _scoped!: ScopedPrisma;

  constructor() {
    super({ log: ['warn', 'error'] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this._scoped = tenantExtension(this);
    this.logger.log('Prisma conectado');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Cliente escopado pelo tenant da requisição atual. Toda query em modelos de
   * tenant recebe `where.tenantId` / `data.tenantId` automaticamente.
   * Lança se não houver tenant no contexto.
   */
  get scoped(): ScopedPrisma {
    return this._scoped;
  }

  /**
   * Acesso SEM escopo de tenant: use `this.prisma.<model>` diretamente
   * (o próprio PrismaService é o client bruto). Uso deliberado e restrito —
   * autenticação (antes de haver contexto) e endpoints de plataforma. Auditar.
   *
   * Obs.: não expomos um getter `global` que retorne `this` porque, com o Proxy
   * do Prisma 5, `this` dentro de um getter perde os acessores de modelo.
   */
}

export { Prisma };
