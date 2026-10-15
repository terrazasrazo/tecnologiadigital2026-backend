import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    metric: z.enum(['talks', 'hours', 'both']).optional(),
    minTalks: z.coerce.number().int().min(0, 'El mínimo no puede ser negativo').max(1000).optional(),
    minHours: z.coerce.number().int().min(0, 'Las horas mínimas no pueden ser negativas').max(10000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No hay valores para actualizar',
  });
