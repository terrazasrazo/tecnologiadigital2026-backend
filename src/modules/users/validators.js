import { z } from 'zod';
import { ROLE_NAMES, USER_STATUSES } from '../../db/models/index.js';
import { passwordSchema } from '../auth/validators.js';

const roleEnum = z.enum(Object.values(ROLE_NAMES));
const statusEnum = z.enum(Object.values(USER_STATUSES));

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    entity: z.string().trim().max(255).nullable().optional(),
    educationLevel: z.string().trim().max(255).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No hay campos para actualizar',
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: passwordSchema,
});

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
  password: passwordSchema,
  role: roleEnum,
  status: statusEnum.optional(),
  entity: z.string().trim().max(255).optional(),
  educationLevel: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().toLowerCase().email('Correo electrónico inválido').optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
    entity: z.string().trim().max(255).nullable().optional(),
    educationLevel: z.string().trim().max(255).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No hay campos para actualizar',
  });

export const updateStatusSchema = z.object({
  status: statusEnum,
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  search: z.string().trim().max(100).optional(),
});
