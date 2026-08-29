import { RouteStatus, StopStatus, DeviceStatus, TenantStatus } from './enums';

/** Transições permitidas da rota. Ver ADR-0005. API valida, web habilita botões. */
export const ROUTE_TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  DRAFT: ['PLANNED', 'CANCELED'],
  PLANNED: ['ASSIGNED', 'DRAFT', 'CANCELED'],
  ASSIGNED: ['IN_PROGRESS', 'PLANNED', 'CANCELED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
};

export const STOP_TRANSITIONS: Record<StopStatus, StopStatus[]> = {
  PENDING: ['EN_ROUTE', 'SKIPPED', 'CANCELED'],
  EN_ROUTE: ['ARRIVED', 'FAILED', 'CANCELED'],
  ARRIVED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  SKIPPED: [],
  CANCELED: [],
};

export const DEVICE_TRANSITIONS: Record<DeviceStatus, DeviceStatus[]> = {
  ACTIVE: ['INACTIVE', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED'],
  INACTIVE: ['ACTIVE', 'DECOMMISSIONED'],
  MAINTENANCE: ['ACTIVE', 'DECOMMISSIONED'],
  LOST: ['ACTIVE', 'DECOMMISSIONED'],
  DECOMMISSIONED: [],
};

export const TENANT_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  TRIAL: ['ACTIVE', 'CANCELED'],
  ACTIVE: ['PAST_DUE', 'SUSPENDED', 'CANCELED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'CANCELED'],
  SUSPENDED: ['ACTIVE', 'CANCELED'],
  CANCELED: [],
};

export function canTransition<T extends string>(map: Record<T, T[]>, from: T, to: T): boolean {
  return map[from]?.includes(to) ?? false;
}

/** Estados terminais (sem saída) de um mapa de transições. */
export function terminalStates<T extends string>(map: Record<T, T[]>): T[] {
  return (Object.keys(map) as T[]).filter((s) => map[s].length === 0);
}
