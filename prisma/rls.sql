-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — 3ª camada de isolamento de tenant (defesa em profundidade). Ver ADR-0002.
--
-- ESTADO: pronto, NÃO aplicado ainda. Depende do wiring de
-- `SET LOCAL app.tenant_id` por transação no PrismaService (item restante da
-- Fase 1 — ver docs/08-roadmap.md). As camadas 1 (contexto de requisição) e 2
-- (extensão do Prisma) já estão ativas e testadas.
--
-- Quando o wiring existir: transformar este arquivo numa migration
-- (`prisma migrate dev --create-only` + colar este conteúdo) e aplicar.
-- ─────────────────────────────────────────────────────────────────────────────

-- Papel da aplicação (não-owner, para que FORCE RLS valha).
-- CREATE ROLE coldchain_app LOGIN PASSWORD '...';
-- GRANT ... ON ALL TABLES IN SCHEMA public TO coldchain_app;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY['User', 'Role', 'RoleAssignment', 'RefreshToken', 'AuditLog'];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (
        "tenantId" IS NOT DISTINCT FROM NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.bypass_rls', true) = 'on'
      )
      WITH CHECK (
        "tenantId" IS NOT DISTINCT FROM NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.bypass_rls', true) = 'on'
      )
    $f$, t);
  END LOOP;
END $$;

-- Fluxo de plataforma / auth: a conexão faz `SET LOCAL app.bypass_rls = 'on'`
-- explicitamente, e a ação é auditada.
