import { z } from 'zod';

export const DunningContactRefZ = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  tenantId: z.string().min(1),
});

export const DunningAttemptZ = z.object({
  id: z.string(),
  at: z.string().datetime({ offset: true }),
  channel: z.enum(['EMAIL', 'SMS', 'CALL', 'WEBHOOK']),
  success: z.boolean(),
  notes: z.string().optional(),
});

export const DunningPlanZ = z.object({
  id: z.string(),
  scheduleDays: z.array(z.number().int().nonnegative()),
  maxAttempts: z.number().int().positive(),
});

export const DunningRecordZ = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amountDueCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  status: z.enum(['PENDING', 'RETRYING', 'FAILED', 'RESOLVED']),
  contact: DunningContactRefZ,
  attempts: z.array(DunningAttemptZ),
  nextAttemptAt: z.string().datetime({ offset: true }).optional(),
  planId: z.string().optional(),
});

export const CreateDunningInputZ = z.object({
  invoiceId: z.string(),
  amountDueCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  contact: DunningContactRefZ,
  planId: z.string().optional(),
});
