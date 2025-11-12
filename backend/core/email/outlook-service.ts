/**
 * Outlook Integration Service
 * Handles Microsoft Graph API integration for Outlook email
 */

import { Client } from '@microsoft/microsoft-graph-client'
import type { Message, User } from '@microsoft/microsoft-graph-types'

import { logger } from '../../utils/logging/logger'

import type {
  EmailMessage,
  EmailAddress,
  EmailSyncOptions,
  SendEmailDto,
  OutlookAuthConfig,
} from './email-types'

export class OutlookService {
  private client: Client | null = null

  constructor(private config: OutlookAuthConfig) {}

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'Mail.Read',
      'Mail.Send',
      'Mail.ReadWrite',
      'User.Read',
    ].join(' ')

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      response_mode: 'query',
      scope: scopes,
      state: state || '',
    })

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code,
            redirect_uri: this.config.redirectUri,
            grant_type: 'authorization_code',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`)
      }

      return await response.json() as { access_token: string; refresh_token: string; expires_in: number }
    } catch (error: any) {
      logger.error('Failed to get tokens from code', { error: error.message })
      throw new Error('Failed to authenticate with Outlook')
    }
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_in: number
  }> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: refreshToken,
            redirect_uri: this.config.redirectUri,
            grant_type: 'refresh_token',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      return await response.json() as { access_token: string; expires_in: number }
    } catch (error: any) {
      logger.error('Failed to refresh access token', { error: error.message })
      throw new Error('Failed to refresh Outlook access token')
    }
  }

  /**
   * Sync messages from Outlook
   */
  async syncMessages(options: EmailSyncOptions = {}): Promise<EmailMessage[]> {
    if (!this.client) {
      throw new Error('Client not initialized. Call setAccessToken first.')
    }

    try {
      const { maxResults = 100, syncFrom } = options

      let query = '/me/messages?$top=' + maxResults + '&$orderby=receivedDateTime desc'

      if (syncFrom) {
        const dateStr = syncFrom.toISOString()
        query += `&$filter=receivedDateTime ge ${dateStr}`
      }

      const response = await this.client.api(query).get()

      const messages: EmailMessage[] = response.value.map((msg: Message) =>
        this.mapOutlookMessage(msg)
      )

      logger.info('Synced messages from Outlook', { count: messages.length })

      return messages
    } catch (error: any) {
      logger.error('Failed to sync Outlook messages', { error: error.message })
      throw new Error('Failed to sync Outlook messages')
    }
  }

  /**
   * Map Outlook message to EmailMessage
   */
  private mapOutlookMessage(msg: Message): EmailMessage {
    const parseAddress = (recipient: any): EmailAddress => ({
      name: recipient?.emailAddress?.name,
      email: recipient?.emailAddress?.address || '',
    })

    const parseAddresses = (recipients: any[]): EmailAddress[] => {
      if (!recipients) return []
      return recipients.map(parseAddress)
    }

    return {
      id: '', // Will be set by repository
      accountId: '', // Will be set by service
      tenantId: '', // Will be set by service
      messageId: msg.id!,
      threadId: msg.conversationId,
      from: msg.from ? parseAddress(msg.from) : { email: '' },
      to: parseAddresses(msg.toRecipients || []),
      cc: parseAddresses(msg.ccRecipients || []),
      bcc: parseAddresses(msg.bccRecipients || []),
      subject: msg.subject || '',
      bodyText: msg.bodyPreview || '',
      bodyHtml: msg.body?.content || '',
      receivedAt: new Date(msg.receivedDateTime!),
      sentAt: msg.sentDateTime ? new Date(msg.sentDateTime) : undefined,
      isRead: msg.isRead || false,
      hasAttachments: msg.hasAttachments || false,
      labels: msg.categories || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Send email via Outlook
   */
  async sendEmail(emailData: SendEmailDto): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized. Call setAccessToken first.')
    }

    try {
      const { to, cc, bcc, subject, bodyHtml, bodyText, replyTo } = emailData

      const formatRecipient = (addr: EmailAddress) => ({
        emailAddress: {
          name: addr.name,
          address: addr.email,
        },
      })

      const message: any = {
        subject,
        body: {
          contentType: bodyHtml ? 'HTML' : 'Text',
          content: bodyHtml || bodyText || '',
        },
        toRecipients: to.map(formatRecipient),
      }

      if (cc && cc.length > 0) {
        message.ccRecipients = cc.map(formatRecipient)
      }

      if (bcc && bcc.length > 0) {
        message.bccRecipients = bcc.map(formatRecipient)
      }

      if (replyTo) {
        message.replyTo = [formatRecipient(replyTo)]
      }

      const response = await this.client.api('/me/sendMail').post({
        message,
        saveToSentItems: true,
      })

      logger.info('Sent email via Outlook', { to: to.map(a => a.email) })

      return 'sent' // Outlook sendMail doesn't return message ID
    } catch (error: any) {
      logger.error('Failed to send Outlook email', { error: error.message })
      throw new Error('Failed to send email via Outlook')
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized. Call setAccessToken first.')
    }

    try {
      await this.client.api(`/me/messages/${messageId}`).patch({
        isRead: true,
      })
    } catch (error: any) {
      logger.error('Failed to mark Outlook message as read', {
        messageId,
        error: error.message,
      })
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<{ email: string; name?: string }> {
    if (!this.client) {
      throw new Error('Client not initialized. Call setAccessToken first.')
    }

    try {
      const user: User = await this.client.api('/me').get()

      return {
        email: user.mail || user.userPrincipalName || '',
        name: user.displayName,
      }
    } catch (error: any) {
      logger.error('Failed to get Outlook user profile', { error: error.message })
      throw new Error('Failed to get Outlook user profile')
    }
  }
}
