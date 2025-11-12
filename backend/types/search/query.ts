export interface SearchFilters {
  tenantId: string;
  q?: string;
  tags?: string[];
  owners?: string[];
  createdFrom?: string; // ISO
  createdTo?: string;   // ISO
  status?: ('open' | 'won' | 'lost' | 'archived')[];
}

export interface Pagination {
  page: number;   // 1-based
  pageSize: number; // 10..200
}

export interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchQuery {
  filters: SearchFilters;
  pagination: Pagination;
  sort?: SortSpec;
  fields?: string[]; // projection
}

export interface SearchHit<T = Record<string, unknown>> {
  id: string;
  score?: number;
  source: T;
  highlights?: Record<string, string[]>;
}

export interface SearchResult<T = Record<string, unknown>> {
  total: number;
  hits: SearchHit<T>[];
  tookMs: number;
}
