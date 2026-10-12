import { z } from 'zod';

const booleanFlag = z.preprocess(
  (value) => (value === undefined || value === '' || value === null ? undefined : value),
  z.coerce.boolean().default(true),
);

export const issueCertificateSchema = z.object({
  sendEmail: booleanFlag,
});

export const listCertificatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
});

export const certificateIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const certificateCodeParamSchema = z.object({
  code: z.string().trim().min(1).max(40),
});
