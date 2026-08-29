# balm-api

**Stack:** NestJS + Prisma + PostgreSQL + Redis (BullMQ).

Núcleo do produto. Toda regra de negócio, autenticação, autorização,
multi-tenancy, ciclo de vida de rotas, ingestão e avaliação de telemetria,
alertas e auditoria vivem aqui. Os frontends não replicam nenhuma dessas decisões.

Extraído do monorepo `coldchain-saas` (`apps/api`) para versionamento próprio.

## Setup

```bash
pnpm install
cp .env.example .env          # ajuste os segredos
pnpm prisma:generate
pnpm prisma:migrate           # aplica as migrations no Postgres local
pnpm seed                     # opcional: dados de exemplo
pnpm dev                      # http://localhost:3333
```

Requer Node >= 20 e um PostgreSQL acessível via `DATABASE_URL`.

## Scripts

| Script                 | O quê                                              |
| ---------------------- | -------------------------------------------------- |
| `pnpm dev`             | Nest em watch mode                                 |
| `pnpm build`           | Compila para `dist/`                               |
| `pnpm start`           | Roda `dist/main.js`                                |
| `pnpm lint`            | ESLint em `src`                                    |
| `pnpm typecheck`       | `tsc --noEmit`                                     |
| `pnpm test`            | Vitest                                             |
| `pnpm prisma:generate` | Gera o Prisma Client                               |
| `pnpm prisma:migrate`  | `prisma migrate dev`                               |
| `pnpm prisma:deploy`   | `prisma migrate deploy` (produção)                 |
| `pnpm seed`            | Popula o banco (`prisma/seed.ts`)                  |

## Estrutura

```
src/
  main.ts
  app.module.ts
  common/            filtros de exceção (RFC 9457), pipes zod, domain errors
  config/            carga e validação de env (zod)
  infra/
    prisma/          PrismaService + escopo de tenant
  iam/               identidade e acesso
    auth/            login, refresh, MFA, tokens de dispositivo
    tenants/         Tenant, configurações, status
    plans/           planos e limites (billing-ready)
    users/           usuários
    rbac/            roles, permissions, guards (@RequirePermissions)
    tenant-context/  middleware + contexto do tenant da requisição
    limits/          uso x limites de plano
  telemetry/
    ingestion/       endpoint de ingestão (batch, idempotência)
    readings/        consulta de série temporal
  audit/             trilha de auditoria
  platform/          endpoints exclusivos do PLATFORM_ADMIN
  health/            healthcheck
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Princípios

- **Camadas:** `controller` (HTTP) → `service` (regra) → Prisma (dados). Regra nunca no controller.
- **Escopo de tenant automático:** nenhum `service` recebe `tenantId` por parâmetro solto —
  ele vem do contexto da requisição e é aplicado por uma extensão do Prisma.
- **Permissões, não papéis:** guards checam `route:update`, não `role === 'admin'`.
- **Erros padronizados:** RFC 9457 (`application/problem+json`).
- **Tudo observável:** log estruturado (pino) com `requestId`/`tenantId`.

## Pendências conhecidas

- **`@coldchain/shared`** — o código ainda importa contratos (schemas zod, enums,
  permissions, state machines) do pacote `@coldchain/shared`, declarado como
  `workspace:*`. Fora do monorepo, `pnpm install` falha nesse pacote. Próximo passo:
  vendorizar esse código em `src/shared/` (ou publicar o pacote) e trocar os imports.
  Arquivos afetados: `src/iam/**`, `src/telemetry/**`, `src/platform/**`.
