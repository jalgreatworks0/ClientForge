/**
 * Search Routes
 * Unified search across contacts, accounts, and deals using Elasticsearch
 */

import { Router } from 'express'
import { authenticate } from '../../../../middleware/authenticate'
import { getElasticsearchClient } from '../../../../../config/database/elasticsearch-config'
import { logger } from '../../../../utils/logging/logger'
import { BadRequestError } from '../../../../utils/errors/app-error'

const router = Router()

/**
 * GET /api/v1/search
 * Unified search across all entities
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q, type, limit = 20, offset = 0 } = req.query
    const tenantId = req.user?.tenantId

    if (!q || typeof q !== 'string') {
      throw new BadRequestError('Search query (q) is required')
    }

    if (!tenantId) {
      throw new BadRequestError('Tenant ID is required')
    }

    // Determine which indexes to search
    const indexes = type
      ? [type as string]
      : ['contacts', 'accounts', 'deals']

    const elasticClient = await getElasticsearchClient()

    const response = await elasticClient.search({
      index: indexes.join(','),
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q,
                  fields: [
                    'first_name^3',
                    'last_name^3',
                    'name^3',
                    'email^2',
                    'phone^2',
                    'company_name^2',
                    'account_name^2',
                    'full_text',
                  ],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              },
              {
                term: {
                  tenant_id: tenantId,
                },
              },
            ],
          },
        },
        highlight: {
          fields: {
            '*': {
              pre_tags: ['<mark>'],
              post_tags: ['</mark>'],
            },
          },
        },
        from: Number(offset),
        size: Number(limit),
      },
    })

    const results = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      type: hit._index,
      score: hit._score,
      data: hit._source,
      highlights: hit.highlight,
    }))

    logger.info('Search executed', {
      query: q,
      type: type || 'all',
      tenantId,
      results: results.length,
    })

    res.json({
      success: true,
      data: {
        results,
        total: response.hits.total,
        query: q,
        type: type || 'all',
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/search/suggest
 * Autocomplete suggestions
 */
router.get('/suggest', authenticate, async (req, res, next) => {
  try {
    const { q, type = 'contacts', limit = 5 } = req.query
    const tenantId = req.user?.tenantId

    if (!q || typeof q !== 'string') {
      throw new BadRequestError('Search query (q) is required')
    }

    if (!tenantId) {
      throw new BadRequestError('Tenant ID is required')
    }

    const elasticClient = await getElasticsearchClient()

    const response = await elasticClient.search({
      index: type as string,
      body: {
        query: {
          bool: {
            must: [
              {
                prefix: {
                  'full_text.keyword': {
                    value: q.toLowerCase(),
                    case_insensitive: true,
                  },
                },
              },
              {
                term: {
                  tenant_id: tenantId,
                },
              },
            ],
          },
        },
        size: Number(limit),
      },
    })

    const suggestions = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      value: hit._source.full_text || hit._source.name,
      data: hit._source,
    }))

    res.json({
      success: true,
      data: suggestions,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/search/stats
 * Search index statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId

    if (!tenantId) {
      throw new BadRequestError('Tenant ID is required')
    }

    const elasticClient = await getElasticsearchClient()

    const [contactsCount, accountsCount, dealsCount] = await Promise.all([
      elasticClient.count({
        index: 'contacts',
        body: {
          query: {
            term: { tenant_id: tenantId },
          },
        },
      }),
      elasticClient.count({
        index: 'accounts',
        body: {
          query: {
            term: { tenant_id: tenantId },
          },
        },
      }),
      elasticClient.count({
        index: 'deals',
        body: {
          query: {
            term: { tenant_id: tenantId },
          },
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        contacts: contactsCount.count,
        accounts: accountsCount.count,
        deals: dealsCount.count,
        total: contactsCount.count + accountsCount.count + dealsCount.count,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
