/** Chaves de limite de plano. `null` no valor = ilimitado. Ver doc 01 e 08. */
export const PLAN_LIMIT_KEYS = [
  'maxUsers',
  'maxDrivers',
  'maxVehicles',
  'maxThermalBoxes',
  'maxDevices',
  'maxActiveRoutes',
  'telemetryRetentionDays',
  'telemetryIngestRatePerMin',
  'apiAccess',
] as const;

export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

/** Qual recurso conta para qual limite (checado na criação). */
export const LIMIT_RESOURCE: Partial<Record<PlanLimitKey, string>> = {
  maxUsers: 'user',
  maxDrivers: 'driver',
  maxVehicles: 'vehicle',
  maxThermalBoxes: 'thermalBox',
  maxDevices: 'device',
  maxActiveRoutes: 'activeRoute',
};

export interface PlanSeed {
  slug: string;
  name: string;
  isPublic: boolean;
  priceCents: number | null;
  limits: Partial<Record<PlanLimitKey, number | null>>;
}

export const PLAN_SEEDS: PlanSeed[] = [
  {
    slug: 'trial',
    name: 'Trial',
    isPublic: true,
    priceCents: 0,
    limits: {
      maxUsers: 3,
      maxDrivers: 5,
      maxVehicles: 5,
      maxThermalBoxes: 10,
      maxDevices: 10,
      maxActiveRoutes: 3,
      telemetryRetentionDays: 30,
      telemetryIngestRatePerMin: 120,
      apiAccess: 0,
    },
  },
  {
    slug: 'pro',
    name: 'Pro',
    isPublic: true,
    priceCents: 49900,
    limits: {
      maxUsers: 25,
      maxDrivers: 50,
      maxVehicles: 50,
      maxThermalBoxes: 100,
      maxDevices: 100,
      maxActiveRoutes: 50,
      telemetryRetentionDays: 365,
      telemetryIngestRatePerMin: 600,
      apiAccess: 1,
    },
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    isPublic: false,
    priceCents: null,
    limits: {
      maxUsers: null,
      maxDrivers: null,
      maxVehicles: null,
      maxThermalBoxes: null,
      maxDevices: null,
      maxActiveRoutes: null,
      telemetryRetentionDays: 1825,
      telemetryIngestRatePerMin: 6000,
      apiAccess: 1,
    },
  },
];
