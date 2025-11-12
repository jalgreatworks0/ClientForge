/**
 * Elasticsearch Tenant Filter Middleware
 * Enforces tenantId filtering on all Elasticsearch queries
 * Prevents cross-tenant data access at the query level
 */

import { Request, Response, NextFunction } from 'express'
import { Client } from '@elastic/elasticsearch'

/**
 * Middleware to enforce tenantId in Elasticsearch queries
 * Automatically injects tenantId filter based on authenticated user
 */
export function enforceTenantFilter(req: Request, res: Response, next: NextFunction): void {
  // Get tenantId from authenticated user
  const tenantId = req.user?.tenantId

  if (!tenantId) {
    res.status(403).json({
      success: false,
      message: 'Tenant context required for search operations'
    })
    return
  }

  // Store tenantId in request for downstream use
  req.searchContext = {
    tenantId,
    originalQuery: req.body?.query
  }

  next()
}

/**
 * Wraps Elasticsearch client to automatically inject tenant filters
 */
export class TenantAwareElasticsearchClient {
  constructor(private client: Client) {}

  /**
   * Search with automatic tenantId filter injection
   */
  async search(params: any, tenantId: string): Promise<any> {
    // Validate tenantId is present
    if (!tenantId) {
      throw new Error('Tenant ID is required for search operations')
    }

    // Extract the original query
    const originalQuery = params.body?.query || { match_all: {} }

    // Inject tenantId filter
    const tenantFilteredQuery = {
      bool: {
        must: [
          originalQuery
        ],
        filter: [
          {
            term: {
              tenantId: tenantId
            }
          }
        ]
      }
    }

    // Replace query with tenant-filtered version
    const filteredParams = {
      ...params,
      body: {
        ...params.body,
        query: tenantFilteredQuery
      }
    }

    // Execute search
    return this.client.search(filteredParams)
  }

  /**
   * Index document with automatic tenantId injection
   */
  async index(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for indexing operations')
    }

    // Inject tenantId into document
    const documentWithTenant = {
      ...params.body,
      tenantId: tenantId
    }

    const indexParams = {
      ...params,
      body: documentWithTenant
    }

    return this.client.index(indexParams)
  }

  /**
   * Bulk operation with automatic tenantId injection
   */
  async bulk(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for bulk operations')
    }

    // Parse bulk operations
    const operations = params.body

    // Inject tenantId into all documents
    const tenantFilteredOperations = operations.map((op: any, index: number) => {
      // Bulk format: [action, document, action, document, ...]
      // Documents are at odd indices
      if (index % 2 === 1) {
        return {
          ...op,
          tenantId: tenantId
        }
      }
      return op
    })

    const bulkParams = {
      ...params,
      body: tenantFilteredOperations
    }

    return this.client.bulk(bulkParams)
  }

  /**
   * Update with tenantId validation
   */
  async update(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for update operations')
    }

    // First, verify the document belongs to this tenant
    const getResponse = await this.client.get({
      index: params.index,
      id: params.id
    })

    const docTenantId = (getResponse._source as any)?.tenantId

    if (docTenantId !== tenantId) {
      throw new Error(`Access denied: Document belongs to different tenant`)
    }

    // Proceed with update
    return this.client.update(params)
  }

  /**
   * Delete with tenantId validation
   */
  async delete(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for delete operations')
    }

    // First, verify the document belongs to this tenant
    const getResponse = await this.client.get({
      index: params.index,
      id: params.id
    })

    const docTenantId = (getResponse._source as any)?.tenantId

    if (docTenantId !== tenantId) {
      throw new Error(`Access denied: Document belongs to different tenant`)
    }

    // Proceed with delete
    return this.client.delete(params)
  }

  /**
   * Count with automatic tenantId filter
   */
  async count(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for count operations')
    }

    const originalQuery = params.body?.query || { match_all: {} }

    const tenantFilteredQuery = {
      bool: {
        must: [originalQuery],
        filter: [{ term: { tenantId: tenantId } }]
      }
    }

    const countParams = {
      ...params,
      body: {
        ...params.body,
        query: tenantFilteredQuery
      }
    }

    return this.client.count(countParams)
  }

  /**
   * Get raw client (use with caution - bypasses tenant filtering!)
   * Only for admin/system operations
   */
  getRawClient(): Client {
    return this.client
  }
}

/**
 * Factory function to create tenant-aware ES client
 */
export function createTenantAwareClient(client: Client): TenantAwareElasticsearchClient {
  return new TenantAwareElasticsearchClient(client)
}

/**
 * Express middleware to attach tenant-aware ES client to request
 */
export function attachTenantAwareClient(client: Client) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.user?.tenantId

    if (!tenantId) {
      res.status(403).json({
        success: false,
        message: 'Tenant context required for search operations'
      })
      return
    }

    // Attach tenant-aware client to request
    req.esClient = createTenantAwareClient(client)
    req.tenantId = tenantId

    next()
  }
}

/**
 * Utility function to get tenant-specific alias name
 */
export function getTenantAlias(indexPrefix: string, tenantId: string): string {
  return `${indexPrefix}-tenant-${tenantId}`
}

/**
 * Utility function to validate tenantId format
 */
export function isValidTenantId(tenantId: string): boolean {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(tenantId)
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      esClient?: TenantAwareElasticsearchClient
      tenantId?: string
      searchContext?: {
        tenantId: string
        originalQuery?: any
      }
    }
  }
}
