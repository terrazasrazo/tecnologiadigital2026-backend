import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20, 'Refresh token inválido'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
  password: passwordSchema,
  entity: z.string().trim().max(255).optional(),
  educationLevel: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
  password: passwordSchema,
});
