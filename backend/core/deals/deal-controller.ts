/**
 * Deal Controller
 * HTTP request handlers for deals API
 */

import { Response, NextFunction } from 'express'

import { AuthRequest } from '../../middleware/authenticate'

import { dealService } from './deal-service'
import {
  createDealSchema,
  updateDealSchema,
  dealListOptionsSchema,
  bulkDealOperationSchema,
  changeDealStageSchema,
  closeDealSchema,
  searchQuerySchema,
} from './deal-validators'
import {
  CreateDealInput,
  BulkDealOperation,
  CloseDealInput,
} from './deal-types'

/**
 * GET /api/v1/deals
 * List deals with pagination and filters
 */
export const listDeals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const options = dealListOptionsSchema.parse({
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      filters: {
        search: req.query.search,
        ownerId: req.query.ownerId,
        accountId: req.query.accountId,
        contactId: req.query.contactId,
        pipelineId: req.query.pipelineId,
        stageId: req.query.stageId,
        amountMin: req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined,
        amountMax: req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined,
        probabilityMin: req.query.probabilityMin ? parseInt(req.query.probabilityMin as string, 10) : undefined,
        probabilityMax: req.query.probabilityMax ? parseInt(req.query.probabilityMax as string, 10) : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        isClosed: req.query.isClosed === 'true' ? true : req.query.isClosed === 'false' ? false : undefined,
        isWon: req.query.isWon === 'true' ? true : req.query.isWon === 'false' ? false : undefined,
        leadSource: req.query.leadSource as string,
      },
    })

    const result = await dealService.listDeals(tenantId, options)

    res.json({
      success: true,
      data: result.deals,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/deals
 * Create a new deal
 */
export const createDeal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = createDealSchema.parse(req.body) as CreateDealInput

    const deal = await dealService.createDeal(tenantId, userId, validatedData)

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal created successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/deals/:id
 * Get deal by ID
 */
export const getDealById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params
    const includeRelations = req.query.include === 'relations'

    const deal = await dealService.getDealById(id, tenantId, includeRelations)

    res.json({
      success: true,
      data: deal,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/v1/deals/:id
 * Update deal
 */
export const updateDeal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = updateDealSchema.parse(req.body)

    const deal = await dealService.updateDeal(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: deal,
      message: 'Deal updated successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/v1/deals/:id
 * Delete deal (soft delete)
 */
export const deleteDeal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    await dealService.deleteDeal(id, tenantId, userId)

    res.json({
      success: true,
      message: 'Deal deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/deals/search
 * Search deals with full-text search
 */
export const searchDeals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const { q, limit } = searchQuerySchema.parse({
      q: req.query.q,
      limit: parseInt(req.query.limit as string, 10) || 20,
    })

    const deals = await dealService.searchDeals(tenantId, q, limit)

    res.json({
      success: true,
      data: deals,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/deals/bulk
 * Bulk operations on deals
 */
export const bulkOperation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = bulkDealOperationSchema.parse(req.body) as BulkDealOperation

    const result = await dealService.bulkOperation(tenantId, userId, validatedData)

    res.json({
      success: true,
      data: result,
      message: `Bulk ${validatedData.operation} completed: ${result.success} succeeded, ${result.failed} failed`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/deals/:id/change-stage
 * Change deal stage
 */
export const changeDealStage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = changeDealStageSchema.parse(req.body)

    const deal = await dealService.changeDealStage(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: deal,
      message: 'Deal stage changed successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/deals/:id/close
 * Close deal (won or lost)
 */
export const closeDeal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = closeDealSchema.parse(req.body) as CloseDealInput

    const deal = await dealService.closeDeal(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: deal,
      message: `Deal closed as ${validatedData.isWon ? 'won' : 'lost'}`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/deals/:id/history
 * Get deal stage change history
 */
export const getDealHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const history = await dealService.getStageHistory(id, tenantId)

    res.json({
      success: true,
      data: history,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/deals/statistics
 * Get deal statistics and metrics
 */
export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const statistics = await dealService.getStatistics(tenantId)

    res.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/deals/import
 * Import deals from CSV/Excel
 * TODO: Implement import logic
 */
export const importDeals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: 'Import functionality not yet implemented',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/deals/export
 * Export deals to CSV/Excel/JSON
 * TODO: Implement export logic
 */
export const exportDeals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: 'Export functionality not yet implemented',
    })
  } catch (error) {
    next(error)
  }
}
