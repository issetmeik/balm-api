import { z } from 'zod';
import { PLAN_LIMIT_KEYS } from '../plan-limits';

export const tenantSettings = z
  .object({
    timezone: z.string().default('America/Sao_Paulo'),
    temperatureUnit: z.enum(['C', 'F']).default('C'),
    locale: z.string().default('pt-BR'),
    proofPolicy: z.enum(['PHOTO', 'PHOTO_AND_SIGNATURE', 'PHOTO_AND_TEMP']).default('PHOTO'),
  })
  .partial();
export type TenantSettings = z.infer<typeof tenantSettings>;

export const updateTenantSettingsBody = z.object({
  settings: tenantSettings,
});

export const tenantResponse = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  cnpj: z.string().nullable(),
  status: z.string(),
  settings: tenantSettings,
  plan: z.object({ slug: z.string(), name: z.string() }),
  trialEndsAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type TenantResponse = z.infer<typeof tenantResponse>;

export const usageResponse = z.object({
  limits: z.array(
    z.object({
      key: z.enum(PLAN_LIMIT_KEYS as unknown as [string, ...string[]]),
      limit: z.number().nullable(),
      used: z.number(),
    }),
  ),
});
export type UsageResponse = z.infer<typeof usageResponse>;

// --- Platform: criação de tenant ---
export const createTenantBody = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'apenas minúsculas, números e hífen'),
  cnpj: z.string().optional(),
  planSlug: z.string().default('trial'),
  admin: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(10),
  }),
});
export type CreateTenantBody = z.infer<typeof createTenantBody>;
