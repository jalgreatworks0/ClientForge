/**
 * ES Adapter Unit Tests
 * Tests for the type-safe Elasticsearch adapter
 */

import { esSearch } from '../es.adapter';
import type { SearchQuery } from '../../../types/search/query';

describe('ES Adapter', () => {
  describe('esSearch', () => {
    it('should map hits into typed SearchResult with highlights', async () => {
      const mockClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            total: { value: 2 },
            hits: [
              {
                _id: '1',
                _score: 1.0,
                _source: { name: 'Alice', email: 'alice@example.com' },
                highlight: { name: ['<em>Alice</em>'] },
              },
              {
                _id: '2',
                _score: 0.8,
                _source: { name: 'Bob', email: 'bob@example.com' },
              },
            ],
          },
        }),
      } as any;

      const query: SearchQuery = {
        filters: { tenantId: 't1', q: 'Alice' },
        pagination: { page: 1, pageSize: 10 },
      };

      const result = await esSearch<{ name: string; email: string }>(
        { client: mockClient, index: 'test-index' },
        query
      );

      expect(result.total).toBe(2);
      expect(result.hits).toHaveLength(2);
      expect(result.hits[0].id).toBe('1');
      expect(result.hits[0].score).toBe(1.0);
      expect(result.hits[0].source.name).toBe('Alice');
      expect(result.hits[0].source.email).toBe('alice@example.com');
      expect(result.hits[0].highlights?.name?.[0]).toContain('<em>Alice</em>');
      expect(result.hits[1].id).toBe('2');
      expect(result.hits[1].highlights).toBeUndefined();
      expect(result.tookMs).toBeGreaterThanOrEqual(0);
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });

    it('should build correct ES query with all filters', async () => {
      const mockClient = {
        search: jest.fn().mockResolvedValue({
          hits: { total: { value: 0 }, hits: [] },
        }),
      } as any;

      const query: SearchQuery = {
        filters: {
          tenantId: 't1',
          q: 'search term',
          tags: ['tag1', 'tag2'],
          owners: ['owner1'],
          createdFrom: '2024-01-01T00:00:00Z',
          createdTo: '2024-12-31T23:59:59Z',
          status: ['open', 'won'],
        },
        pagination: { page: 2, pageSize: 25 },
        sort: { field: 'createdAt', direction: 'desc' },
        fields: ['name', 'email'],
      };

      await esSearch({ client: mockClient, index: 'test-index' }, query);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.index).toBe('test-index');
      expect(searchCall.from).toBe(25); // page 2, pageSize 25
      expect(searchCall.size).toBe(25);
      expect(searchCall._source).toEqual(['name', 'email']);
      expect(searchCall.sort).toBeDefined();
      expect(searchCall.query.bool.must).toContainEqual({ term: { tenantId: 't1' } });
      expect(searchCall.query.bool.must).toContainEqual({ query_string: { query: 'search term' } });
      expect(searchCall.query.bool.must).toContainEqual({ terms: { tags: ['tag1', 'tag2'] } });
      expect(searchCall.query.bool.must).toContainEqual({ terms: { ownerId: ['owner1'] } });
      expect(searchCall.query.bool.must).toContainEqual({ terms: { status: ['open', 'won'] } });
      expect(searchCall.highlight).toBeDefined();
    });

    it('should handle empty results gracefully', async () => {
      const mockClient = {
        search: jest.fn().mockResolvedValue({
          hits: { total: { value: 0 }, hits: [] },
        }),
      } as any;

      const query: SearchQuery = {
        filters: { tenantId: 't1' },
        pagination: { page: 1, pageSize: 10 },
      };

      const result = await esSearch({ client: mockClient, index: 'test-index' }, query);

      expect(result.total).toBe(0);
      expect(result.hits).toEqual([]);
      expect(result.tookMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing optional filters', async () => {
      const mockClient = {
        search: jest.fn().mockResolvedValue({
          hits: { total: { value: 1 }, hits: [{ _id: '1', _source: { name: 'Test' } }] },
        }),
      } as any;

      const query: SearchQuery = {
        filters: { tenantId: 't1' }, // Only required field
        pagination: { page: 1, pageSize: 10 },
      };

      const result = await esSearch({ client: mockClient, index: 'test-index' }, query);

      expect(result.total).toBe(1);
      expect(result.hits[0].id).toBe('1');

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.must).toHaveLength(1); // Only tenantId filter
      expect(searchCall.query.bool.must[0]).toEqual({ term: { tenantId: 't1' } });
    });

    it('should handle date range filters', async () => {
      const mockClient = {
        search: jest.fn().mockResolvedValue({
          hits: { total: { value: 0 }, hits: [] },
        }),
      } as any;

      const query: SearchQuery = {
        filters: {
          tenantId: 't1',
          createdFrom: '2024-01-01T00:00:00Z',
          createdTo: '2024-01-31T23:59:59Z',
        },
        pagination: { page: 1, pageSize: 10 },
      };

      await esSearch({ client: mockClient, index: 'test-index' }, query);

      const searchCall = mockClient.search.mock.calls[0][0];
      const rangeFilter = searchCall.query.bool.must.find((f: any) => f.range);
      expect(rangeFilter).toBeDefined();
      expect(rangeFilter.range.createdAt.gte).toBe('2024-01-01T00:00:00Z');
      expect(rangeFilter.range.createdAt.lte).toBe('2024-01-31T23:59:59Z');
    });

    it('should calculate correct pagination offset', async () => {
      const mockClient = {
        search: jest.fn().mockResolvedValue({
          hits: { total: { value: 0 }, hits: [] },
        }),
      } as any;

      // Test page 1
      await esSearch(
        { client: mockClient, index: 'idx' },
        { filters: { tenantId: 't1' }, pagination: { page: 1, pageSize: 20 } }
      );
      expect(mockClient.search.mock.calls[0][0].from).toBe(0);

      // Test page 3
      await esSearch(
        { client: mockClient, index: 'idx' },
        { filters: { tenantId: 't1' }, pagination: { page: 3, pageSize: 20 } }
      );
      expect(mockClient.search.mock.calls[1][0].from).toBe(40); // (3-1) * 20
    });
  });
});
