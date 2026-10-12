import { z } from 'zod';

const optionalText = (max) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalUserId = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const createSpeakerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  academicDegree: optionalText(150),
  institution: optionalText(255),
  bio: optionalText(5000),
  userId: optionalUserId,
});

export const updateSpeakerSchema = z.object({
  name: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().min(1).max(150).optional(),
  ),
  academicDegree: optionalText(150),
  institution: optionalText(255),
  bio: optionalText(5000),
});

export const listSpeakersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
});
