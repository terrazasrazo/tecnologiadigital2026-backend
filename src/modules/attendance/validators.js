import { z } from 'zod';
import { REGISTRATION_STATUSES } from '../../db/models/talk-registration.js';

export const checkInSchema = z.object({
  token: z.string().trim().min(1, 'El código QR es obligatorio'),
});

export const manualAttendanceSchema = z.object({
  userId: z.coerce.number().int().positive(),
  attended: z.preprocess(
    (value) => (value === undefined || value === '' || value === null ? undefined : value),
    z.coerce.boolean().default(true),
  ),
});

export const listRegistrationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(Object.values(REGISTRATION_STATUSES)).optional(),
});
