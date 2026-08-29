import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS, SYSTEM_ROLES, ROLE_PERMISSIONS, PLAN_SEEDS } from '@coldchain/shared';

const prisma = new PrismaClient();

/**
 * Idempotente. Compostos únicos com coluna anulável (tenantId) não são
 * confiáveis em upsert no Postgres (NULLs distintos), então usamos findFirst.
 */

async function ensureGlobalRole(key: string, name: string) {
  const existing = await prisma.role.findFirst({ where: { key, tenantId: null } });
  if (existing) {
    if (existing.name !== name) {
      await prisma.role.update({ where: { id: existing.id }, data: { name } });
    }
    return existing;
  }
  return prisma.role.create({ data: { key, name, isSystem: true, tenantId: null } });
}

async function ensureUser(params: {
  tenantId: string | null;
  email: string;
  name: string;
  password: string;
  isPlatformStaff?: boolean;
}) {
  const existing = await prisma.user.findFirst({
    where: { email: params.email, tenantId: params.tenantId },
  });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      tenantId: params.tenantId,
      email: params.email,
      name: params.name,
      passwordHash: await argon2.hash(params.password, { type: argon2.argon2id }),
      status: 'ACTIVE',
      isPlatformStaff: params.isPlatformStaff ?? false,
    },
  });
}

async function ensureAssignment(userId: string, roleId: string, tenantId: string | null) {
  const existing = await prisma.roleAssignment.findFirst({ where: { userId, roleId, tenantId } });
  if (!existing) await prisma.roleAssignment.create({ data: { userId, roleId, tenantId } });
}

async function main() {
  console.log('› Permissões');
  for (const key of PERMISSIONS) {
    const group = key.split(':')[0];
    await prisma.permission.upsert({ where: { key }, update: { group }, create: { key, group } });
  }

  console.log('› Papéis-semente + permissões');
  for (const role of SYSTEM_ROLES) {
    const r = await ensureGlobalRole(role.key, role.name);
    const perms = ROLE_PERMISSIONS[role.key] ?? [];
    const permRows = await prisma.permission.findMany({ where: { key: { in: [...perms] } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: r.id } });
    await prisma.rolePermission.createMany({
      data: permRows.map((p) => ({ roleId: r.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('› Planos + limites');
  for (const plan of PLAN_SEEDS) {
    const p = await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: { name: plan.name, isPublic: plan.isPublic, priceCents: plan.priceCents },
      create: {
        slug: plan.slug,
        name: plan.name,
        isPublic: plan.isPublic,
        priceCents: plan.priceCents,
      },
    });
    for (const [key, value] of Object.entries(plan.limits)) {
      await prisma.planLimit.upsert({
        where: { planId_key: { planId: p.id, key } },
        update: { value: value ?? null },
        create: { planId: p.id, key, value: value ?? null },
      });
    }
  }

  console.log('› Staff de plataforma');
  const platformAdminRole = await ensureGlobalRole('PLATFORM_ADMIN', 'Administrador da plataforma');
  const platformUser = await ensureUser({
    tenantId: null,
    email: 'admin@coldchain.app',
    name: 'Plataforma',
    password: 'ChangeMe!Platform1',
    isPlatformStaff: true,
  });
  await ensureAssignment(platformUser.id, platformAdminRole.id, null);

  console.log('› Tenant demo');
  const trial = await prisma.plan.findFirstOrThrow({ where: { slug: 'trial' } });
  const tenantAdminRole = await ensureGlobalRole('TENANT_ADMIN', 'Administrador da empresa');
  const demo = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Transportadora Demo',
      planId: trial.id,
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 864e5),
    },
  });
  const demoAdmin = await ensureUser({
    tenantId: demo.id,
    email: 'admin@demo.com',
    name: 'Gestor Demo',
    password: 'ChangeMe!Demo1',
  });
  await ensureAssignment(demoAdmin.id, tenantAdminRole.id, demo.id);

  // Motorista do tenant demo — usado pelo app mobile para ingestão de telemetria.
  const driverRole = await ensureGlobalRole('DRIVER', 'Motorista');
  const demoDriver = await ensureUser({
    tenantId: demo.id,
    email: 'motorista@demo.com',
    name: 'Motorista Demo',
    password: 'ChangeMe!Driver1',
  });
  await ensureAssignment(demoDriver.id, driverRole.id, demo.id);

  console.log('\n✔ Seed concluído');
  console.log('  Plataforma : admin@coldchain.app / ChangeMe!Platform1');
  console.log('  Tenant demo: admin@demo.com / ChangeMe!Demo1  (tenantSlug: demo)');
  console.log('  Motorista  : motorista@demo.com / ChangeMe!Driver1  (tenantSlug: demo)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
