import { z } from 'zod';

export const DateRangeZ = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export const AnalyticsFiltersZ = z.object({
  tenantId: z.string().min(1),
  userId: z.string().optional(),
  pipeline: z.string().optional(),
  stage: z.string().optional(),
  ownerId: z.string().optional(),
});

export const AnalyticsRequestZ = z.object({
  range: DateRangeZ,
  filters: AnalyticsFiltersZ,
});
