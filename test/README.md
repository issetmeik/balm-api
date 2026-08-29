# Testes da API

## Agora (Fase 1)

- **Unitários** (`src/**/*.test.ts`, sem I/O): guards, mapeamento de erros,
  máquinas de estado (via `@coldchain/shared`). Rodam em `pnpm --filter @coldchain/api test`.
- **Smoke manual** validado nesta fase (contra o Postgres do docker-compose):
  login · refresh + reuse detection · `/auth/me` com permissões resolvidas ·
  isolamento entre tenants (empresa A não vê dados de B) · limite de plano
  (`maxUsers` → 402) · guard de plataforma (403) · trilha de auditoria.

## Próximo (item de conclusão da Fase 1)

- **Integração** com Postgres efêmero (Testcontainers): cada módulo com um teste
  "cross-tenant → 404/403" obrigatório, além dos fluxos felizes.
- **Wiring de RLS** (`prisma/rls.sql`) + teste que comprova o isolamento na 3ª
  camada mesmo com a extensão do Prisma desativada.
- CI roda `integration` contra o serviço `postgres` do workflow.
