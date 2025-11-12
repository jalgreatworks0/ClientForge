import type { Client } from '@elastic/elasticsearch';

import type { SearchQuery, SearchResult } from '../../types/search/query';

export interface EsAdapterDeps {
  client: Client;
  index: string;
}

export async function esSearch<T = Record<string, unknown>>(
  deps: EsAdapterDeps,
  query: SearchQuery
): Promise<SearchResult<T>> {
  const { client, index } = deps;
  const { filters, pagination, sort, fields } = query;

  const must: any[] = [{ term: { tenantId: filters.tenantId } }];
  if (filters.q) must.push({ query_string: { query: filters.q } });
  if (filters.tags?.length) must.push({ terms: { tags: filters.tags } });
  if (filters.owners?.length) must.push({ terms: { ownerId: filters.owners } });
  if (filters.createdFrom || filters.createdTo) {
    must.push({
      range: {
        createdAt: {
          gte: filters.createdFrom,
          lte: filters.createdTo,
        },
      },
    });
  }
  if (filters.status?.length) must.push({ terms: { status: filters.status } });

  const sortClause = sort ? [{ [sort.field]: { order: sort.direction } }] : undefined;

  const from = (pagination.page - 1) * pagination.pageSize;
  const size = pagination.pageSize;

  const start = Date.now();
  const resp = await client.search({
    index,
    from,
    size,
    sort: sortClause as any,
    _source: fields,
    query: { bool: { must } } as any,
    highlight: filters.q
      ? { fields: { '*': {} as any }, require_field_match: false }
      : undefined,
  } as any);
  const tookMs = Date.now() - start;

  // Defensive parsing while keeping result strongly typed
  const total = (resp.hits?.total as any)?.value ?? 0;
  const hits =
    (resp.hits?.hits ?? []).map((h: any) => ({
      id: h._id as string,
      score: h._score as number | undefined,
      source: (h._source ?? {}) as T,
      highlights: h.highlight as Record<string, string[]> | undefined,
    })) || [];

  return { total, hits, tookMs };
}
