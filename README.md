# balm-api

**Stack:** NestJS + Prisma + PostgreSQL + Redis (BullMQ).

Núcleo do produto. Toda regra de negócio, autenticação, autorização,
multi-tenancy, ciclo de vida de rotas, ingestão e avaliação de telemetria,
alertas e auditoria vivem aqui. Os frontends não replicam nenhuma dessas decisões.

Extraído do monorepo `coldchain-saas` (`apps/api`) para versionamento próprio.

## Setup

Requer **Node >= 20**, **pnpm** e **Docker** (ou um PostgreSQL próprio via `DATABASE_URL`).

```bash
pnpm install
cp .env.example .env          # ajuste os segredos se quiser
docker compose up -d          # Postgres em localhost:5434
pnpm prisma:generate
pnpm prisma:deploy            # aplica as 2 migrations
pnpm seed                     # usuários/planos/permissões de exemplo
pnpm dev                      # http://localhost:3333  (docs: /api/docs)
```

Smoke test:

```bash
curl http://localhost:3333/api/health/ready
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"ChangeMe!Demo1","tenantSlug":"demo"}'
```

Usuários do seed:

| Papel | E-mail | Senha | tenantSlug |
| --- | --- | --- | --- |
| Plataforma | `admin@coldchain.app` | `ChangeMe!Platform1` | — |
| Admin da empresa | `admin@demo.com` | `ChangeMe!Demo1` | `demo` |
| Motorista | `motorista@demo.com` | `ChangeMe!Driver1` | `demo` |

> Testes unitários (`pnpm test`) **não** precisam de banco.

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
  shared/            contratos internos (schemas zod, enums, permissions,
                     plan-limits, state machines) — antes o pacote @coldchain/shared
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

## Contratos internos (`src/shared/`)

Os contratos que antes vinham do pacote `@coldchain/shared` do monorepo foram
internalizados em `src/shared/` — sem dependência externa. Fonte única para:

- `enums.ts` — enums do domínio, espelhados no `schema.prisma`
- `permissions.ts` — lista canônica de permissões + papéis-semente
- `plan-limits.ts` — chaves de limite e planos-semente
- `state-machines.ts` — transições de rota/parada/dispositivo/tenant
- `contracts/*.ts` — DTOs zod de auth, tenant, user, ingestão

Se o monorepo `coldchain-saas` também evoluir esses contratos, mantê-los em sincronia
é manual até um eventual pacote publicado.
