/**
 * Search Routes
 * Unified search across contacts, accounts, and deals using Elasticsearch
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '@middleware/authenticate'
import { getElasticsearchClient } from '@config/database/elasticsearch-config'
import { logger } from '@utils/logging/logger'
import { ValidationError } from '@utils/errors/app-error'
import { qStr, qInt } from '@utils/http/query'
import { AuthRequest } from '@middleware/auth'

const router = Router()

/**
 * GET /api/v1/search
 * Unified search across all entities
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = qStr(req.query.q)
    const type = qStr(req.query.type)
    const limit = qInt(req.query.limit, 20)
    const offset = qInt(req.query.offset, 0)
    const tenantId = req.user.tenantId

    if (!q) {
      throw new ValidationError('Search query (q) is required')
    }

    // Determine which indexes to search
    const indexes = type ? [type] : ['contacts', 'accounts', 'deals']

    const elasticClient = await getElasticsearchClient()

    const response = await elasticClient.search({
      index: indexes.join(','),
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
                  tenantId: tenantId,
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
      from: offset,
      size: limit,
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
router.get('/suggest', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = qStr(req.query.q)
    const type = qStr(req.query.type) ?? 'contacts'
    const limit = qInt(req.query.limit, 5)
    const tenantId = req.user.tenantId

    if (!q) {
      throw new ValidationError('Search query (q) is required')
    }

    const elasticClient = await getElasticsearchClient()

    const response = await elasticClient.search({
      index: type,
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
                  tenantId: tenantId,
                },
              },
            ],
          },
        },
      size: limit,
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
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user.tenantId

    const elasticClient = await getElasticsearchClient()

    const [contactsCount, accountsCount, dealsCount] = await Promise.all([
      elasticClient.count({
        index: 'contacts',
        query: {
          term: { tenantId: tenantId },
        },
      }),
      elasticClient.count({
        index: 'accounts',
        query: {
          term: { tenantId: tenantId },
        },
      }),
      elasticClient.count({
        index: 'deals',
        query: {
          term: { tenantId: tenantId },
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        contacts: (contactsCount as any).count || 0,
        accounts: (accountsCount as any).count || 0,
        deals: (dealsCount as any).count || 0,
        total: ((contactsCount as any).count || 0) + ((accountsCount as any).count || 0) + ((dealsCount as any).count || 0),
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
