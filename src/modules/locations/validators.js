import { z } from 'zod';

const optionalText = (max) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalCapacity = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z.number().int().positive().max(100000).optional(),
);

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  building: optionalText(150),
  capacity: optionalCapacity,
  address: optionalText(255),
});

export const updateLocationSchema = z.object({
  name: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().min(1).max(150).optional(),
  ),
  building: optionalText(150),
  capacity: optionalCapacity,
  address: optionalText(255),
});

export const listLocationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
});
