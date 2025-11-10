/**
 * Contact Controller
 * HTTP request handlers for contact endpoints
 */

import { Request, Response, NextFunction } from 'express'
import { contactService } from './contact-service'
import { AuthRequest } from '../../middleware/authenticate'
import { logger } from '../../utils/logging/logger'
import {
  createContactSchema,
  updateContactSchema,
  contactListOptionsSchema,
  bulkContactOperationSchema,
  searchQuerySchema,
} from './contact-validators'
import {
  CreateContactInput,
  BulkContactOperation,
} from './contact-types'

/**
 * Create a new contact
 * POST /api/v1/contacts
 */
export const createContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = createContactSchema.parse(req.body) as CreateContactInput

    const contact = await contactService.createContact(tenantId, userId, validatedData)

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Contact created successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get contact by ID
 * GET /api/v1/contacts/:id
 */
export const getContactById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params
    const includeRelations = req.query.include === 'relations'

    const contact = await contactService.getContactById(id, tenantId, includeRelations)

    res.json({
      success: true,
      data: contact,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * List contacts with pagination and filters
 * GET /api/v1/contacts
 */
export const listContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    // Parse and validate query parameters
    const options = contactListOptionsSchema.parse({
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      filters: {
        search: req.query.search,
        ownerId: req.query.ownerId,
        accountId: req.query.accountId,
        leadStatus: req.query.leadStatus,
        lifecycleStage: req.query.lifecycleStage,
        leadScoreMin: req.query.leadScoreMin
          ? parseInt(req.query.leadScoreMin as string, 10)
          : undefined,
        leadScoreMax: req.query.leadScoreMax
          ? parseInt(req.query.leadScoreMax as string, 10)
          : undefined,
        tags: req.query.tags
          ? Array.isArray(req.query.tags)
            ? req.query.tags
            : [req.query.tags]
          : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      },
    })

    const result = await contactService.listContacts(tenantId, options)

    res.json({
      success: true,
      data: result.contacts,
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
 * Update contact
 * PUT /api/v1/contacts/:id
 */
export const updateContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = updateContactSchema.parse(req.body)

    const contact = await contactService.updateContact(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: contact,
      message: 'Contact updated successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete contact (soft delete)
 * DELETE /api/v1/contacts/:id
 */
export const deleteContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    await contactService.deleteContact(id, tenantId, userId)

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Search contacts
 * GET /api/v1/contacts/search
 */
export const searchContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const { q, limit } = searchQuerySchema.parse({
      q: req.query.q,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    })

    const contacts = await contactService.searchContacts(tenantId, q, limit)

    res.json({
      success: true,
      data: contacts,
      count: contacts.length,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Bulk operations on contacts
 * POST /api/v1/contacts/bulk
 */
export const bulkOperation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = bulkContactOperationSchema.parse(req.body) as BulkContactOperation

    const result = await contactService.bulkOperation(tenantId, userId, validatedData)

    res.json({
      success: true,
      data: result,
      message: `Bulk ${validatedData.operation} completed`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Mark contact as contacted
 * POST /api/v1/contacts/:id/contacted
 */
export const markAsContacted = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    await contactService.markAsContacted(id, tenantId)

    res.json({
      success: true,
      message: 'Contact marked as contacted',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Calculate lead score
 * POST /api/v1/contacts/:id/calculate-score
 */
export const calculateLeadScore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const score = await contactService.calculateLeadScore(id, tenantId)

    res.json({
      success: true,
      data: { leadScore: score },
      message: 'Lead score calculated',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get contact statistics
 * GET /api/v1/contacts/statistics
 */
export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const statistics = await contactService.getStatistics(tenantId)

    res.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get contact activities
 * GET /api/v1/contacts/:id/activities
 */
export const getContactActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    // Verify contact exists
    await contactService.getContactById(id, tenantId)

    // TODO: Implement activities retrieval (Week 8)
    res.json({
      success: true,
      data: [],
      message: 'Activities feature coming in Week 8',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Add note to contact
 * POST /api/v1/contacts/:id/notes
 */
export const addContactNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    // Verify contact exists
    await contactService.getContactById(id, tenantId)

    // TODO: Implement notes creation (Week 9)
    res.json({
      success: true,
      message: 'Notes feature coming in Week 9',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Export contacts
 * POST /api/v1/contacts/export
 */
export const exportContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    // TODO: Implement export functionality
    res.json({
      success: true,
      message: 'Export feature coming soon',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Import contacts
 * POST /api/v1/contacts/import
 */
export const importContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    // TODO: Implement import functionality
    res.json({
      success: true,
      message: 'Import feature coming soon',
    })
  } catch (error) {
    next(error)
  }
}
