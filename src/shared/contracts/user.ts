import { z } from 'zod';

export const userResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  mfaEnabled: z.boolean(),
  roles: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type UserResponse = z.infer<typeof userResponse>;

export const createUserBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  roleKeys: z.array(z.string()).min(1),
  phone: z.string().optional(),
  // Fase 1: admin define a senha inicial. Fase futura: fluxo de convite por e-mail.
  password: z.string().min(10),
});
export type CreateUserBody = z.infer<typeof createUserBody>;

export const updateUserBody = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});
export type UpdateUserBody = z.infer<typeof updateUserBody>;

export const setUserRolesBody = z.object({
  roleKeys: z.array(z.string()).min(1),
});

export const roleResponse = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
});
export type RoleResponse = z.infer<typeof roleResponse>;
