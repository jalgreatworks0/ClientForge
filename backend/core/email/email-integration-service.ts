/**
 * Email Integration Service
 * Manages Gmail and Outlook integrations for CRM email sync
 */

import { db } from '../../database/postgresql/pool'
import { logger } from '../../utils/logging/logger'

import { GmailService } from './gmail-service'
import { OutlookService } from './outlook-service'
import type {
  EmailAccount,
  EmailMessage,
  EmailSyncOptions,
  SendEmailDto,
  EmailSearchFilters,
} from './email-types'

export class EmailIntegrationService {
  private gmailService: GmailService
  private outlookService: OutlookService

  constructor() {
    // Initialize with config from environment
    this.gmailService = new GmailService({
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      redirectUri: process.env.GMAIL_REDIRECT_URI || '',
    })

    this.outlookService = new OutlookService({
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
      redirectUri: process.env.OUTLOOK_REDIRECT_URI || '',
      tenantId: process.env.OUTLOOK_tenantId || 'common',
    })
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(provider: 'gmail' | 'outlook', userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, provider })).toString('base64')

    if (provider === 'gmail') {
      return this.gmailService.getAuthUrl(state)
    } else {
      return this.outlookService.getAuthUrl(state)
    }
  }

  /**
   * Handle OAuth callback and save account
   */
  async handleOAuthCallback(
    code: string,
    provider: 'gmail' | 'outlook',
    userId: string,
    tenantId: string
  ): Promise<EmailAccount> {
    try {
      let tokens: any
      let email: string
      let expiresAt: Date

      if (provider === 'gmail') {
        tokens = await this.gmailService.getTokensFromCode(code)
        this.gmailService.setCredentials(tokens.access_token, tokens.refresh_token)
        const profile = await this.gmailService.getUserProfile()
        email = profile.email
        expiresAt = new Date(tokens.expiry_date)
      } else {
        tokens = await this.outlookService.getTokensFromCode(code)
        this.outlookService.setAccessToken(tokens.access_token)
        const profile = await this.outlookService.getUserProfile()
        email = profile.email
        expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
      }

      // Save to database
      const result = await db.query(
        `INSERT INTO email_accounts (
          user_id, tenantId, provider, email, access_token, refresh_token, expires_at,
          is_active, sync_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
        ON CONFLICT (user_id, provider, email)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          is_active = true,
          updated_at = NOW()
        RETURNING
          id, user_id as "userId", tenantId as "tenantId", provider, email,
          access_token as "accessToken", refresh_token as "refreshToken",
          expires_at as "expiresAt", is_active as "isActive",
          sync_enabled as "syncEnabled", last_sync_at as "lastSyncAt",
          created_at as "createdAt", updated_at as "updatedAt"`,
        [userId, tenantId, provider, email, tokens.access_token, tokens.refresh_token, expiresAt]
      )

      logger.info('Email account connected', { provider, email, userId })

      return result.rows[0]
    } catch (error: any) {
      logger.error('Failed to handle OAuth callback', {
        provider,
        error: error.message,
      })
      throw new Error('Failed to connect email account')
    }
  }

  /**
   * Sync messages for an account
   */
  async syncAccount(accountId: string, options: EmailSyncOptions = {}): Promise<number> {
    try {
      // Get account
      const accountResult = await db.query(
        `SELECT id, user_id, tenantId, provider, email, access_token, refresh_token, expires_at, last_sync_at
         FROM email_accounts WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
        [accountId]
      )

      if (accountResult.rows.length === 0) {
        throw new Error('Email account not found')
      }

      const account = accountResult.rows[0]

      // Check if token needs refresh
      if (new Date() >= new Date(account.expires_at)) {
        await this.refreshAccountToken(accountId)
        // Re-fetch account with new token
        const refreshedAccount = await db.query(
          `SELECT access_token, refresh_token FROM email_accounts WHERE id = $1`,
          [accountId]
        )
        account.access_token = refreshedAccount.rows[0].access_token
        account.refresh_token = refreshedAccount.rows[0].refresh_token
      }

      // Set sync options
      const syncOptions: EmailSyncOptions = {
        ...options,
        syncFrom: options.syncFrom || account.last_sync_at || undefined,
      }

      // Sync messages
      let messages: EmailMessage[]

      if (account.provider === 'gmail') {
        this.gmailService.setCredentials(account.access_token, account.refresh_token)
        messages = await this.gmailService.syncMessages(syncOptions)
      } else {
        this.outlookService.setAccessToken(account.access_token)
        messages = await this.outlookService.syncMessages(syncOptions)
      }

      // Save messages to database
      let savedCount = 0
      for (const message of messages) {
        try {
          await db.query(
            `INSERT INTO email_messages (
              account_id, tenantId, message_id, thread_id,
              from_name, from_email, to_addresses, cc_addresses, bcc_addresses,
              subject, body_text, body_html, received_at, sent_at,
              is_read, has_attachments, labels
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (account_id, message_id) DO NOTHING`,
            [
              accountId,
              account.tenantId,
              message.messageId,
              message.threadId,
              message.from.name,
              message.from.email,
              JSON.stringify(message.to),
              JSON.stringify(message.cc || []),
              JSON.stringify(message.bcc || []),
              message.subject,
              message.bodyText,
              message.bodyHtml,
              message.receivedAt,
              message.sentAt,
              message.isRead,
              message.hasAttachments,
              message.labels || [],
            ]
          )
          savedCount++
        } catch (error: any) {
          logger.error('Failed to save email message', {
            messageId: message.messageId,
            error: error.message,
          })
        }
      }

      // Update last sync time
      await db.query(
        `UPDATE email_accounts SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [accountId]
      )

      logger.info('Email sync completed', {
        accountId,
        provider: account.provider,
        messagesFound: messages.length,
        messagesSaved: savedCount,
      })

      return savedCount
    } catch (error: any) {
      logger.error('Failed to sync email account', {
        accountId,
        error: error.message,
      })
      throw new Error('Failed to sync email account')
    }
  }

  /**
   * Refresh account token
   */
  private async refreshAccountToken(accountId: string): Promise<void> {
    try {
      const result = await db.query(
        `SELECT provider, refresh_token FROM email_accounts WHERE id = $1`,
        [accountId]
      )

      if (result.rows.length === 0) {
        throw new Error('Account not found')
      }

      const { provider, refresh_token } = result.rows[0]

      let newTokens: any

      if (provider === 'gmail') {
        newTokens = await this.gmailService.refreshAccessToken(refresh_token)
        await db.query(
          `UPDATE email_accounts
           SET access_token = $1, expires_at = $2, updated_at = NOW()
           WHERE id = $3`,
          [newTokens.access_token, new Date(newTokens.expiry_date), accountId]
        )
      } else {
        newTokens = await this.outlookService.refreshAccessToken(refresh_token)
        await db.query(
          `UPDATE email_accounts
           SET access_token = $1, expires_at = $2, updated_at = NOW()
           WHERE id = $3`,
          [newTokens.access_token, new Date(Date.now() + newTokens.expires_in * 1000), accountId]
        )
      }

      logger.info('Refreshed email account token', { accountId, provider })
    } catch (error: any) {
      logger.error('Failed to refresh email account token', {
        accountId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Send email from account
   */
  async sendEmail(accountId: string, emailData: SendEmailDto): Promise<string> {
    try {
      const accountResult = await db.query(
        `SELECT provider, access_token, refresh_token, expires_at
         FROM email_accounts WHERE id = $1 AND is_active = true`,
        [accountId]
      )

      if (accountResult.rows.length === 0) {
        throw new Error('Email account not found')
      }

      const account = accountResult.rows[0]

      // Refresh token if needed
      if (new Date() >= new Date(account.expires_at)) {
        await this.refreshAccountToken(accountId)
        const refreshed = await db.query(
          `SELECT access_token, refresh_token FROM email_accounts WHERE id = $1`,
          [accountId]
        )
        account.access_token = refreshed.rows[0].access_token
        account.refresh_token = refreshed.rows[0].refresh_token
      }

      let messageId: string

      if (account.provider === 'gmail') {
        this.gmailService.setCredentials(account.access_token, account.refresh_token)
        messageId = await this.gmailService.sendEmail(emailData)
      } else {
        this.outlookService.setAccessToken(account.access_token)
        messageId = await this.outlookService.sendEmail(emailData)
      }

      logger.info('Email sent', {
        accountId,
        provider: account.provider,
        to: emailData.to.map(a => a.email),
      })

      return messageId
    } catch (error: any) {
      logger.error('Failed to send email', { accountId, error: error.message })
      throw new Error('Failed to send email')
    }
  }

  /**
   * List email accounts for user
   */
  async listAccounts(userId: string, tenantId: string): Promise<EmailAccount[]> {
    const result = await db.query(
      `SELECT id, user_id as "userId", tenantId as "tenantId", provider, email,
              is_active as "isActive", sync_enabled as "syncEnabled",
              last_sync_at as "lastSyncAt", created_at as "createdAt",
              updated_at as "updatedAt"
       FROM email_accounts
       WHERE user_id = $1 AND tenantId = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId, tenantId]
    )

    return result.rows
  }

  /**
   * Search email messages
   */
  async searchMessages(
    tenantId: string,
    filters: EmailSearchFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: any[]; total: number }> {
    const offset = (page - 1) * limit

    let query = `
      SELECT id, account_id as "accountId", tenantId as "tenantId",
             message_id as "messageId", thread_id as "threadId",
             from_name, from_email, to_addresses, cc_addresses,
             subject, body_text as "bodyText", received_at as "receivedAt",
             is_read as "isRead", has_attachments as "hasAttachments",
             labels, contact_id as "contactId", deal_id as "dealId",
             created_at as "createdAt"
      FROM email_messages
      WHERE tenantId = $1
    `

    const params: any[] = [tenantId]
    let paramCount = 2

    if (filters.from) {
      query += ` AND from_email ILIKE $${paramCount}`
      params.push(`%${filters.from}%`)
      paramCount++
    }

    if (filters.subject) {
      query += ` AND subject ILIKE $${paramCount}`
      params.push(`%${filters.subject}%`)
      paramCount++
    }

    if (filters.isRead !== undefined) {
      query += ` AND is_read = $${paramCount}`
      params.push(filters.isRead)
      paramCount++
    }

    if (filters.dateFrom) {
      query += ` AND received_at >= $${paramCount}`
      params.push(filters.dateFrom)
      paramCount++
    }

    if (filters.dateTo) {
      query += ` AND received_at <= $${paramCount}`
      params.push(filters.dateTo)
      paramCount++
    }

    if (filters.contactId) {
      query += ` AND contact_id = $${paramCount}`
      params.push(filters.contactId)
      paramCount++
    }

    if (filters.dealId) {
      query += ` AND deal_id = $${paramCount}`
      params.push(filters.dealId)
      paramCount++
    }

    query += ` ORDER BY received_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    params.push(limit, offset)

    const [messagesResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(`SELECT COUNT(*) FROM email_messages WHERE tenantId = $1`, [tenantId]),
    ])

    return {
      messages: messagesResult.rows,
      total: parseInt(countResult.rows[0].count),
    }
  }
}

export const emailIntegrationService = new EmailIntegrationService()
