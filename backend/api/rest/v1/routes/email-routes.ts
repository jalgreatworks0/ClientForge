/**
 * Email Integration API Routes
 * Handles OAuth flow, account management, email sync, and sending
 */

import { Router, Request, Response } from 'express'
import { authenticate } from '../../../../middleware/authenticate'
import { emailIntegrationService } from '../../../../core/email/email-integration-service'
import { logger } from '../../../../utils/logging/logger'
import type { EmailSearchFilters, SendEmailDto } from '../../../../core/email/email-types'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/email/auth/:provider
 * Get OAuth authorization URL for email provider
 */
router.get('/auth/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    if (provider !== 'gmail' && provider !== 'outlook') {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gmail" or "outlook"',
      })
    }

    const authUrl = emailIntegrationService.getAuthUrl(provider as 'gmail' | 'outlook', userId)

    logger.info('[Email] Generated OAuth URL', {
      userId,
      provider,
      tenantId: req.user?.tenantId,
    })

    res.json({
      success: true,
      data: {
        authUrl,
        provider,
      },
    })
  } catch (error: any) {
    logger.error('[Email] Failed to generate auth URL', {
      error: error.message,
      provider: req.params.provider,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL',
      error: error.message,
    })
  }
})

/**
 * POST /api/v1/email/callback
 * Handle OAuth callback after user authorizes email access
 * Body: { code: string, provider: 'gmail' | 'outlook' }
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, provider } = req.body
    const userId = req.user?.id
    const tenantId = req.user?.tenantId

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    if (!code || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, provider',
      })
    }

    if (provider !== 'gmail' && provider !== 'outlook') {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gmail" or "outlook"',
      })
    }

    const account = await emailIntegrationService.handleOAuthCallback(
      code,
      provider as 'gmail' | 'outlook',
      userId,
      tenantId
    )

    logger.info('[Email] OAuth callback successful', {
      userId,
      tenantId,
      provider,
      accountId: account.id,
      email: account.email,
    })

    res.status(201).json({
      success: true,
      data: account,
      message: `${provider} account connected successfully`,
    })
  } catch (error: any) {
    logger.error('[Email] OAuth callback failed', {
      error: error.message,
      userId: req.user?.id,
      provider: req.body.provider,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to connect email account',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/email/accounts
 * List all email accounts for the authenticated user
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const tenantId = req.user?.tenantId

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    const accounts = await emailIntegrationService.listAccounts(userId, tenantId)

    logger.info('[Email] Listed email accounts', {
      userId,
      tenantId,
      count: accounts.length,
    })

    res.json({
      success: true,
      data: accounts,
    })
  } catch (error: any) {
    logger.error('[Email] Failed to list email accounts', {
      error: error.message,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to list email accounts',
      error: error.message,
    })
  }
})

/**
 * POST /api/v1/email/accounts/:accountId/sync
 * Trigger manual sync for an email account
 */
router.post(
  '/accounts/:accountId/sync',
  async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params
      const { maxResults, syncFrom } = req.body

      const options: any = {}
      if (maxResults) options.maxResults = parseInt(maxResults)
      if (syncFrom) options.syncFrom = new Date(syncFrom)

      const messageCount = await emailIntegrationService.syncAccount(accountId, options)

      logger.info('[Email] Manual sync completed', {
        accountId,
        messageCount,
        userId: req.user?.id,
      })

      res.json({
        success: true,
        data: {
          accountId,
          messagesSynced: messageCount,
        },
        message: `Synced ${messageCount} messages`,
      })
    } catch (error: any) {
      logger.error('[Email] Manual sync failed', {
        error: error.message,
        accountId: req.params.accountId,
        userId: req.user?.id,
      })

      res.status(500).json({
        success: false,
        message: 'Failed to sync email account',
        error: error.message,
      })
    }
  }
)

/**
 * DELETE /api/v1/email/accounts/:accountId
 * Disconnect an email account (soft delete)
 */
router.delete(
  '/accounts/:accountId',
  async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params
      const userId = req.user?.id

      // Soft delete by setting deleted_at
      const { db } = require('../../../../database/postgresql/pool')
      await db.query(
        `UPDATE email_accounts
         SET deleted_at = NOW(), is_active = false, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [accountId, userId]
      )

      logger.info('[Email] Email account disconnected', {
        accountId,
        userId,
      })

      res.json({
        success: true,
        message: 'Email account disconnected successfully',
      })
    } catch (error: any) {
      logger.error('[Email] Failed to disconnect email account', {
        error: error.message,
        accountId: req.params.accountId,
        userId: req.user?.id,
      })

      res.status(500).json({
        success: false,
        message: 'Failed to disconnect email account',
        error: error.message,
      })
    }
  }
)

/**
 * GET /api/v1/email/messages
 * Search and filter email messages
 * Query params: from, subject, isRead, dateFrom, dateTo, contactId, dealId, page, limit
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    const filters: EmailSearchFilters = {}
    if (req.query.from) filters.from = req.query.from as string
    if (req.query.subject) filters.subject = req.query.subject as string
    if (req.query.isRead !== undefined) filters.isRead = req.query.isRead === 'true'
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string)
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string)
    if (req.query.contactId) filters.contactId = req.query.contactId as string
    if (req.query.dealId) filters.dealId = req.query.dealId as string

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50

    const result = await emailIntegrationService.searchMessages(tenantId, filters, page, limit)

    logger.info('[Email] Searched email messages', {
      tenantId,
      filters,
      page,
      limit,
      resultsCount: result.messages.length,
      totalCount: result.total,
    })

    res.json({
      success: true,
      data: result.messages,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    })
  } catch (error: any) {
    logger.error('[Email] Failed to search email messages', {
      error: error.message,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to search email messages',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/email/messages/:messageId
 * Get a single email message by ID
 */
router.get(
  '/messages/:messageId',
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params
      const tenantId = req.user?.tenantId

      const { db } = require('../../../../database/postgresql/pool')
      const result = await db.query(
        `SELECT id, account_id as "accountId", tenant_id as "tenantId",
                message_id as "messageId", thread_id as "threadId",
                from_name, from_email, to_addresses, cc_addresses, bcc_addresses,
                subject, body_text as "bodyText", body_html as "bodyHtml",
                received_at as "receivedAt", sent_at as "sentAt",
                is_read as "isRead", has_attachments as "hasAttachments",
                labels, contact_id as "contactId", deal_id as "dealId",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM email_messages
         WHERE id = $1 AND tenant_id = $2`,
        [messageId, tenantId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Email message not found',
        })
      }

      res.json({
        success: true,
        data: result.rows[0],
      })
    } catch (error: any) {
      logger.error('[Email] Failed to get email message', {
        error: error.message,
        messageId: req.params.messageId,
        userId: req.user?.id,
      })

      res.status(500).json({
        success: false,
        message: 'Failed to get email message',
        error: error.message,
      })
    }
  }
)

/**
 * POST /api/v1/email/send
 * Send an email via a connected account
 * Body: { accountId: string, to: EmailAddress[], subject: string, bodyHtml?: string, bodyText?: string, ... }
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, replyTo } = req.body

    if (!accountId || !to || !subject || (!bodyHtml && !bodyText)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: accountId, to, subject, and body (HTML or text)',
      })
    }

    const emailData: SendEmailDto = {
      to,
      cc,
      bcc,
      subject,
      bodyHtml,
      bodyText,
      replyTo,
    }

    const messageId = await emailIntegrationService.sendEmail(accountId, emailData)

    logger.info('[Email] Email sent successfully', {
      accountId,
      to: to.map((a: any) => a.email),
      subject,
      userId: req.user?.id,
    })

    res.status(201).json({
      success: true,
      data: {
        messageId,
      },
      message: 'Email sent successfully',
    })
  } catch (error: any) {
    logger.error('[Email] Failed to send email', {
      error: error.message,
      accountId: req.body.accountId,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message,
    })
  }
})

/**
 * PATCH /api/v1/email/messages/:messageId/link
 * Link an email message to a contact or deal
 * Body: { contactId?: string, dealId?: string }
 */
router.patch(
  '/messages/:messageId/link',
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params
      const { contactId, dealId } = req.body
      const tenantId = req.user?.tenantId

      if (!contactId && !dealId) {
        return res.status(400).json({
          success: false,
          message: 'Must provide at least one of: contactId, dealId',
        })
      }

      const { db } = require('../../../../database/postgresql/pool')

      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (contactId !== undefined) {
        updates.push(`contact_id = $${paramCount}`)
        values.push(contactId)
        paramCount++
      }

      if (dealId !== undefined) {
        updates.push(`deal_id = $${paramCount}`)
        values.push(dealId)
        paramCount++
      }

      values.push(messageId, tenantId)

      await db.query(
        `UPDATE email_messages
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}`,
        values
      )

      logger.info('[Email] Email message linked to CRM record', {
        messageId,
        contactId,
        dealId,
        userId: req.user?.id,
      })

      res.json({
        success: true,
        message: 'Email linked successfully',
      })
    } catch (error: any) {
      logger.error('[Email] Failed to link email message', {
        error: error.message,
        messageId: req.params.messageId,
        userId: req.user?.id,
      })

      res.status(500).json({
        success: false,
        message: 'Failed to link email message',
        error: error.message,
      })
    }
  }
)

export default router
