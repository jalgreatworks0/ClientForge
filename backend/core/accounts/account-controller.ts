/**
 * Account Controller
 * HTTP request handlers for accounts API
 */

import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/authenticate'
import { accountService } from './account-service'
import {
  createAccountSchema,
  updateAccountSchema,
  accountListOptionsSchema,
  bulkAccountOperationSchema,
  accountNoteSchema,
  searchQuerySchema,
} from './account-validators'
import {
  CreateAccountInput,
  BulkAccountOperation,
} from './account-types'

/**
 * GET /api/v1/accounts
 * List accounts with pagination and filters
 */
export const listAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const options = accountListOptionsSchema.parse({
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      filters: {
        search: req.query.search,
        ownerId: req.query.ownerId,
        industry: req.query.industry,
        companySize: req.query.companySize,
        accountType: req.query.accountType,
        accountStatus: req.query.accountStatus,
        revenueMin: req.query.revenueMin ? parseFloat(req.query.revenueMin as string) : undefined,
        revenueMax: req.query.revenueMax ? parseFloat(req.query.revenueMax as string) : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        parentAccountId: req.query.parentAccountId,
        hasParent: req.query.hasParent === 'true' ? true : req.query.hasParent === 'false' ? false : undefined,
      },
    })

    const result = await accountService.listAccounts(tenantId, options)

    res.json({
      success: true,
      data: result.accounts,
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
 * POST /api/v1/accounts
 * Create a new account
 */
export const createAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = createAccountSchema.parse(req.body) as CreateAccountInput

    const account = await accountService.createAccount(tenantId, userId, validatedData)

    res.status(201).json({
      success: true,
      data: account,
      message: 'Account created successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/accounts/:id
 * Get account by ID
 */
export const getAccountById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params
    const includeRelations = req.query.include === 'relations'

    const account = await accountService.getAccountById(id, tenantId, includeRelations)

    res.json({
      success: true,
      data: account,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/v1/accounts/:id
 * Update account
 */
export const updateAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = updateAccountSchema.parse(req.body)

    const account = await accountService.updateAccount(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: account,
      message: 'Account updated successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/v1/accounts/:id
 * Delete account (soft delete)
 */
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    await accountService.deleteAccount(id, tenantId, userId)

    res.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/accounts/search
 * Search accounts with full-text search
 */
export const searchAccounts = async (
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

    const accounts = await accountService.searchAccounts(tenantId, q, limit)

    res.json({
      success: true,
      data: accounts,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/accounts/bulk
 * Bulk operations on accounts
 */
export const bulkOperation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = bulkAccountOperationSchema.parse(req.body) as BulkAccountOperation

    const result = await accountService.bulkOperation(tenantId, userId, validatedData)

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
 * GET /api/v1/accounts/:id/hierarchy
 * Get account hierarchy (parent and children)
 */
export const getAccountHierarchy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const hierarchy = await accountService.getAccountHierarchy(id, tenantId)

    res.json({
      success: true,
      data: hierarchy,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/accounts/:id/activity
 * Mark account as having recent activity
 */
export const markActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    await accountService.markActivity(id, tenantId)

    res.json({
      success: true,
      message: 'Account activity marked',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/accounts/statistics
 * Get account statistics and metrics
 */
export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const statistics = await accountService.getStatistics(tenantId)

    res.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/accounts/import
 * Import accounts from CSV/Excel
 * TODO: Implement import logic
 */
export const importAccounts = async (
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
 * POST /api/v1/accounts/export
 * Export accounts to CSV/Excel/JSON
 * TODO: Implement export logic
 */
export const exportAccounts = async (
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

/**
 * GET /api/v1/accounts/:id/activities
 * Get account activities and interactions
 * TODO: Implement activities retrieval
 */
export const getAccountActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: 'Account activities functionality not yet implemented',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/accounts/:id/notes
 * Add a note to account
 * TODO: Implement notes functionality
 */
export const addAccountNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = accountNoteSchema.parse(req.body)

    res.status(501).json({
      success: false,
      message: 'Account notes functionality not yet implemented',
    })
  } catch (error) {
    next(error)
  }
}
