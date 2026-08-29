import { z } from 'zod';
import { PERMISSIONS } from '../permissions';

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1).optional(),
  mfaCode: z.string().length(6).optional(),
});
export type LoginBody = z.infer<typeof loginBody>;

export const refreshBody = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshBody = z.infer<typeof refreshBody>;

export const tokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type TokenPair = z.infer<typeof tokenPair>;

export const mfaChallenge = z.object({
  mfaRequired: z.literal(true),
  challengeToken: z.string(),
});

export const loginResponse = z.union([tokenPair, mfaChallenge]);
export type LoginResponse = z.infer<typeof loginResponse>;

export const permissionEnum = z.enum(PERMISSIONS as unknown as [string, ...string[]]);

export const meResponse = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    isPlatformStaff: z.boolean(),
    mfaEnabled: z.boolean(),
  }),
  tenant: z
    .object({
      id: z.string().uuid(),
      slug: z.string(),
      name: z.string(),
      status: z.string(),
    })
    .nullable(),
  roles: z.array(z.string()),
  permissions: z.array(permissionEnum),
});
export type MeResponse = z.infer<typeof meResponse>;
