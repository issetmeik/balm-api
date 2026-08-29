/**
 * Lista canônica de permissões (recurso:ação) e os papéis-semente.
 * Guards da API checam estas strings — nunca `role === 'admin'`. Ver ADR-0003.
 */

export const PERMISSIONS = [
  // tenant / plataforma
  'tenant:read',
  'tenant:settings',
  'tenant:usage:read',
  'platform:tenant:manage',
  'platform:plan:manage',

  // acesso
  'user:read',
  'user:invite',
  'user:update',
  'role:read',
  'role:manage',

  // operação
  'driver:read',
  'driver:manage',
  'vehicle:read',
  'vehicle:manage',
  'thermal_box:read',
  'thermal_box:manage',
  'device:read',
  'device:manage',
  'device:assign',
  'customer:read',
  'customer:manage',

  // rotas
  'route:read',
  'route:create',
  'route:update',
  'route:transition',
  'route:cancel',
  'stop:update',
  'stop:transition',
  'stop:proof',

  // telemetria / alertas / relatórios
  'telemetry:read',
  'telemetry:ingest',
  'alert_rule:read',
  'alert_rule:manage',
  'alert:read',
  'alert:acknowledge',
  'report:generate',
  'report:read',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_KEYS = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  TENANT_MANAGER: 'TENANT_MANAGER',
  DISPATCHER: 'DISPATCHER',
  DRIVER: 'DRIVER',
  VIEWER: 'VIEWER',
} as const;
export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

const ALL: Permission[] = [...PERMISSIONS];

const TENANT_ADMIN: Permission[] = ALL.filter(
  (p) => !p.startsWith('platform:') && p !== 'telemetry:ingest',
);

const TENANT_MANAGER: Permission[] = [
  'tenant:read',
  'tenant:usage:read',
  'user:read',
  'role:read',
  'driver:read',
  'driver:manage',
  'vehicle:read',
  'vehicle:manage',
  'thermal_box:read',
  'thermal_box:manage',
  'device:read',
  'device:manage',
  'device:assign',
  'customer:read',
  'customer:manage',
  'route:read',
  'route:create',
  'route:update',
  'route:transition',
  'route:cancel',
  'stop:update',
  'stop:transition',
  'stop:proof',
  'telemetry:read',
  'alert_rule:read',
  'alert_rule:manage',
  'alert:read',
  'alert:acknowledge',
  'report:generate',
  'report:read',
  'audit:read',
];

const DISPATCHER: Permission[] = [
  'tenant:read',
  'driver:read',
  'vehicle:read',
  'thermal_box:read',
  'device:read',
  'customer:read',
  'customer:manage',
  'route:read',
  'route:create',
  'route:update',
  'route:transition',
  'stop:update',
  'stop:transition',
  'telemetry:read',
  'alert:read',
  'alert:acknowledge',
  'report:generate',
  'report:read',
];

const DRIVER: Permission[] = [
  'route:read',
  'route:transition',
  'stop:transition',
  'stop:proof',
  'telemetry:ingest',
  'thermal_box:read',
  'device:read',
];

const VIEWER: Permission[] = [
  'tenant:read',
  'driver:read',
  'vehicle:read',
  'thermal_box:read',
  'device:read',
  'customer:read',
  'route:read',
  'telemetry:read',
  'alert:read',
  'report:read',
];

/** Permissões concedidas por cada papel-semente. */
export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  PLATFORM_ADMIN: ['platform:tenant:manage', 'platform:plan:manage', 'audit:read'],
  TENANT_ADMIN,
  TENANT_MANAGER,
  DISPATCHER,
  DRIVER,
  VIEWER,
};

export const SYSTEM_ROLES: { key: RoleKey; name: string; platform: boolean }[] = [
  { key: 'PLATFORM_ADMIN', name: 'Administrador da plataforma', platform: true },
  { key: 'TENANT_ADMIN', name: 'Administrador da empresa', platform: false },
  { key: 'TENANT_MANAGER', name: 'Gestor', platform: false },
  { key: 'DISPATCHER', name: 'Operador de rotas', platform: false },
  { key: 'DRIVER', name: 'Motorista', platform: false },
  { key: 'VIEWER', name: 'Somente leitura', platform: false },
];
