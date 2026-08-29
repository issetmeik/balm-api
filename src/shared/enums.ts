/**
 * Enums do domínio. Fonte única — espelhados no schema.prisma da API.
 * Um teste na API garante que não divergem.
 */

export const TenantStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  SUSPENDED: 'SUSPENDED',
  CANCELED: 'CANCELED',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const UserStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const DriverStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const VehicleStatus = {
  AVAILABLE: 'AVAILABLE',
  IN_USE: 'IN_USE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const ThermalBoxStatus = {
  AVAILABLE: 'AVAILABLE',
  IN_USE: 'IN_USE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
  LOST: 'LOST',
} as const;
export type ThermalBoxStatus = (typeof ThermalBoxStatus)[keyof typeof ThermalBoxStatus];

export const DeviceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  LOST: 'LOST',
  DECOMMISSIONED: 'DECOMMISSIONED',
} as const;
export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];

export const DeviceProtocol = {
  BLE: 'BLE',
  LORAWAN: 'LORAWAN',
  NB_IOT: 'NB_IOT',
  WIFI: 'WIFI',
  MANUAL: 'MANUAL',
} as const;
export type DeviceProtocol = (typeof DeviceProtocol)[keyof typeof DeviceProtocol];

export const RouteStatus = {
  DRAFT: 'DRAFT',
  PLANNED: 'PLANNED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
} as const;
export type RouteStatus = (typeof RouteStatus)[keyof typeof RouteStatus];

export const StopStatus = {
  PENDING: 'PENDING',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  CANCELED: 'CANCELED',
} as const;
export type StopStatus = (typeof StopStatus)[keyof typeof StopStatus];

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const AlertRuleType = {
  TEMP_ABOVE: 'TEMP_ABOVE',
  TEMP_BELOW: 'TEMP_BELOW',
  TEMP_EXCURSION: 'TEMP_EXCURSION',
  PREDICTIVE_EXCURSION: 'PREDICTIVE_EXCURSION',
  NO_COMMUNICATION: 'NO_COMMUNICATION',
  LOW_BATTERY: 'LOW_BATTERY',
  GEOFENCE_EXIT: 'GEOFENCE_EXIT',
  ROUTE_OVERDUE: 'ROUTE_OVERDUE',
} as const;
export type AlertRuleType = (typeof AlertRuleType)[keyof typeof AlertRuleType];

export const TelemetryQuality = {
  OK: 'OK',
  SUSPECT_GEO: 'SUSPECT_GEO',
  SUSPECT_TEMP: 'SUSPECT_TEMP',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
} as const;
export type TelemetryQuality = (typeof TelemetryQuality)[keyof typeof TelemetryQuality];
