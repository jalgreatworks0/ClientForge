/**
 * Elasticsearch Tenant Filter Middleware
 * Enforces tenant_id filtering on all Elasticsearch queries
 * Prevents cross-tenant data access at the query level
 */

import { Request, Response, NextFunction } from 'express'
import { Client } from '@elastic/elasticsearch'

/**
 * Middleware to enforce tenant_id in Elasticsearch queries
 * Automatically injects tenant_id filter based on authenticated user
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

  // Store tenant_id in request for downstream use
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
   * Search with automatic tenant_id filter injection
   */
  async search(params: any, tenantId: string): Promise<any> {
    // Validate tenant_id is present
    if (!tenantId) {
      throw new Error('Tenant ID is required for search operations')
    }

    // Extract the original query
    const originalQuery = params.body?.query || { match_all: {} }

    // Inject tenant_id filter
    const tenantFilteredQuery = {
      bool: {
        must: [
          originalQuery
        ],
        filter: [
          {
            term: {
              tenant_id: tenantId
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
   * Index document with automatic tenant_id injection
   */
  async index(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for indexing operations')
    }

    // Inject tenant_id into document
    const documentWithTenant = {
      ...params.body,
      tenant_id: tenantId
    }

    const indexParams = {
      ...params,
      body: documentWithTenant
    }

    return this.client.index(indexParams)
  }

  /**
   * Bulk operation with automatic tenant_id injection
   */
  async bulk(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for bulk operations')
    }

    // Parse bulk operations
    const operations = params.body

    // Inject tenant_id into all documents
    const tenantFilteredOperations = operations.map((op: any, index: number) => {
      // Bulk format: [action, document, action, document, ...]
      // Documents are at odd indices
      if (index % 2 === 1) {
        return {
          ...op,
          tenant_id: tenantId
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
   * Update with tenant_id validation
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

    const docTenantId = (getResponse._source as any)?.tenant_id

    if (docTenantId !== tenantId) {
      throw new Error(`Access denied: Document belongs to different tenant`)
    }

    // Proceed with update
    return this.client.update(params)
  }

  /**
   * Delete with tenant_id validation
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

    const docTenantId = (getResponse._source as any)?.tenant_id

    if (docTenantId !== tenantId) {
      throw new Error(`Access denied: Document belongs to different tenant`)
    }

    // Proceed with delete
    return this.client.delete(params)
  }

  /**
   * Count with automatic tenant_id filter
   */
  async count(params: any, tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for count operations')
    }

    const originalQuery = params.body?.query || { match_all: {} }

    const tenantFilteredQuery = {
      bool: {
        must: [originalQuery],
        filter: [{ term: { tenant_id: tenantId } }]
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
 * Utility function to validate tenant_id format
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
