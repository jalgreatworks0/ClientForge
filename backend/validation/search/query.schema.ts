import { z } from 'zod';

export const SearchFiltersZ = z.object({
  tenantId: z.string().min(1),
  q: z.string().optional(),
  tags: z.array(z.string()).optional(),
  owners: z.array(z.string()).optional(),
  createdFrom: z.string().datetime({ offset: true }).optional(),
  createdTo: z.string().datetime({ offset: true }).optional(),
  status: z.array(z.enum(['open', 'won', 'lost', 'archived'])).optional(),
});

export const PaginationZ = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(25),
});

export const SortSpecZ = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
}).optional();

export const SearchQueryZ = z.object({
  filters: SearchFiltersZ,
  pagination: PaginationZ,
  sort: SortSpecZ,
  fields: z.array(z.string()).optional(),
});
