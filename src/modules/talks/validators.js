import { z } from 'zod';
import { TALK_STATUSES } from '../../db/models/talk.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeTime = (value) => (value.length === 5 ? `${value}:00` : value);

const timeField = z
  .string()
  .regex(TIME_REGEX, 'La hora debe tener el formato HH:MM')
  .transform(normalizeTime);

const dateField = z
  .string()
  .regex(DATE_REGEX, 'La fecha debe tener el formato AAAA-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Fecha inválida');

const optionalText = (max) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalNumberId = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

const optionalSpeakerIds = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return Array.isArray(value) ? value : [value];
}, z.array(z.coerce.number().int().positive()).max(50).optional());

export const createTalkSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio').max(200),
    description: optionalText(5000),
    date: dateField,
    startTime: timeField,
    endTime: timeField,
    locationId: optionalNumberId,
    status: z.enum(Object.values(TALK_STATUSES)).optional(),
    speakerIds: optionalSpeakerIds,
  })
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'La hora de término debe ser posterior a la de inicio',
      });
    }
  });

export const updateTalkSchema = z.object({
  title: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().min(1).max(200).optional(),
  ),
  description: optionalText(5000),
  date: dateField.optional(),
  startTime: timeField.optional(),
  endTime: timeField.optional(),
  locationId: optionalNumberId,
  status: z.enum(Object.values(TALK_STATUSES)).optional(),
  speakerIds: optionalSpeakerIds,
});

export const listTalksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(200).optional(),
  date: z.string().regex(DATE_REGEX).optional(),
  locationId: z.coerce.number().int().positive().optional(),
  status: z.enum(Object.values(TALK_STATUSES)).optional(),
});
