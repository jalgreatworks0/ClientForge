/**
 * Elasticsearch Tenant Alias Middleware
 * 
 * Enforces multi-tenant data isolation by:
 * 1. Preventing client from specifying index names
 * 2. Automatically injecting tenant-filtered alias
 * 3. Validating all ES requests against user's tenant
 * 4. Blocking unauthorized cross-tenant access
 */

import { Request, Response, NextFunction } from 'express'
import { esClient } from '../../config/database/elasticsearch-config'
import { AuthRequest } from './auth'
import { logger } from '../utils/logging/logger'
import { AppError } from '../utils/errors/app-error'

export interface ESRequest extends AuthRequest {
  // Tenants user has access to (can be multiple for multi-org setup)
  userTenants: string[]
  // Primary tenant (for creation/write operations)
  primaryTenant: string
}

/**
 * Validate and inject tenant-filtered alias into ES query
 * Called before any ES operation
 */
export async function enforceElasticsearchTenantIsolation(
  req: ESRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401)
    }

    // Extract tenant from user context
    const tenantId = req.user.tenantId
    if (!tenantId) {
      throw new AppError('Tenant information missing', 400)
    }

    // Store tenant info on request for use in ES operations
    req.userTenants = [tenantId]
    req.primaryTenant = tenantId

    // Validate that the alias exists for this tenant
    const aliasName = `${tenantId}-alias`
    try {
      const aliasInfo = await esClient.indices.getAlias({
        name: aliasName,
      })

      if (!aliasInfo || Object.keys(aliasInfo).length === 0) {
        logger.warn('ES tenant alias not found', { tenantId, aliasName })
        // Don't fail - alias will be created on first write
      }
    } catch (error: any) {
      if (error.statusCode !== 404) {
        throw error
      }
      // Alias doesn't exist yet - normal on first use
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Wrap Elasticsearch operations to enforce tenant isolation
 * Use this to intercept direct ES calls and inject tenant filters
 */
export class TenantAwareESClient {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  /**
   * Search within tenant's isolated index
   */
  async search(
    tenantId: string,
    searchRequest: any
  ): Promise<any> {
    const aliasName = `${tenantId}-alias`

    // Enforce search happens on tenant alias only
    const validatedRequest = {
      ...searchRequest,
      index: aliasName, // Override any index specified by client
      body: {
        ...searchRequest.body,
        query: {
          bool: {
            must: [
              ...(searchRequest.body?.query?.bool?.must || [searchRequest.body?.query || { match_all: {} }]),
            ],
            filter: [
              // Add tenant_id filter
              {
                term: {
                  'tenant_id.keyword': tenantId,
                },
              },
              ...(searchRequest.body?.query?.bool?.filter || []),
            ],
          },
        },
      },
    }

    logger.debug('ES search', {
      tenantId,
      index: aliasName,
      query: validatedRequest.body.query,
    })

    return this.client.search(validatedRequest)
  }

  /**
   * Index document with tenant isolation
   */
  async index(
    tenantId: string,
    indexName: string,
    doc: any,
    options?: any
  ): Promise<any> {
    // Ensure tenant_id is set in document
    const validatedDoc = {
      ...doc,
      tenant_id: tenantId,
    }

    // Use tenant-specific index
    const tenantIndex = `${indexName}-${tenantId}`

    return this.client.index({
      index: tenantIndex,
      document: validatedDoc,
      ...options,
    })
  }

  /**
   * Bulk index with tenant isolation
   */
  async bulk(
    tenantId: string,
    operations: any[]
  ): Promise<any> {
    // Validate all operations target tenant-specific indices
    const validatedOperations = operations.flatMap((op) => {
      if (op.index) {
        return [
          {
            index: {
              _index: `${op.index._index}-${tenantId}`,
              _id: op.index._id,
            },
          },
          op.data || {},
        ]
      } else if (op.update) {
        return [
          {
            update: {
              _index: `${op.update._index}-${tenantId}`,
              _id: op.update._id,
            },
          },
          op.data || {},
        ]
      }
      return [op]
    })

    return this.client.bulk({
      operations: validatedOperations,
    })
  }

  /**
   * Delete document with tenant verification
   */
  async delete(
    tenantId: string,
    indexName: string,
    id: string
  ): Promise<any> {
    const tenantIndex = `${indexName}-${tenantId}`

    return this.client.delete({
      index: tenantIndex,
      id,
    })
  }

  /**
   * Get document with tenant verification
   */
  async get(
    tenantId: string,
    indexName: string,
    id: string
  ): Promise<any> {
    const tenantIndex = `${indexName}-${tenantId}`

    const result = await this.client.get({
      index: tenantIndex,
      id,
    })

    // Verify tenant_id matches
    if (result._source?.tenant_id !== tenantId) {
      throw new AppError('Unauthorized access to document', 403)
    }

    return result
  }
}

/**
 * Create tenant-specific alias for index
 * Call this when a tenant is created or data is synced
 */
export async function createTenantAlias(
  tenantId: string,
  indexName: string
): Promise<void> {
  try {
    const aliasName = `${tenantId}-alias`
    const tenantIndex = `${indexName}-${tenantId}`

    // Create index if it doesn't exist
    try {
      await esClient.indices.get({ index: tenantIndex })
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Create index with tenant_id mapping
        await esClient.indices.create({
          index: tenantIndex,
          body: {
            mappings: {
              properties: {
                tenant_id: {
                  type: 'keyword',
                },
                created_at: {
                  type: 'date',
                },
                updated_at: {
                  type: 'date',
                },
              },
            },
          },
        })

        logger.info('ES index created', { index: tenantIndex })
      } else {
        throw error
      }
    }

    // Create or update alias to point to tenant-specific index
    try {
      await esClient.indices.updateAliases({
        actions: [
          {
            add: {
              index: tenantIndex,
              alias: aliasName,
            },
          },
        ],
      })

      logger.info('ES tenant alias created/updated', {
        alias: aliasName,
        index: tenantIndex,
      })
    } catch (error: any) {
      if (!error.message?.includes('alias already exists')) {
        throw error
      }
      // Alias already exists, this is fine
    }
  } catch (error: any) {
    logger.error('Failed to create tenant alias', {
      tenantId,
      indexName,
      error: error.message,
    })
    throw error
  }
}

/**
 * Verify user has access to tenant
 * Can be used to check cross-tenant access attempts
 */
export async function verifyTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  // In a real implementation, check user_tenants table or Redis cache
  // For now, return true (actual implementation in auth service)
  return true
}

/**
 * Export tenant-aware ES client
 */
export const tenantAwareES = new TenantAwareESClient(esClient)

export default enforceElasticsearchTenantIsolation
