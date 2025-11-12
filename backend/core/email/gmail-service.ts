/**
 * Gmail Integration Service
 * Handles Gmail API integration for email sync and sending
 */

import { google } from 'googleapis'
import type { GaxiosResponse } from 'gaxios'

import { logger } from '../../utils/logging/logger'

import type {
  EmailMessage,
  EmailAddress,
  EmailSyncOptions,
  SendEmailDto,
  GmailAuthConfig,
} from './email-types'

export class GmailService {
  private oauth2Client: any
  private gmail: any

  constructor(private config: GmailAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state || '',
      prompt: 'consent', // Force to get refresh token
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string
    refresh_token: string
    expiry_date: number
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      return tokens
    } catch (error: any) {
      logger.error('Failed to get tokens from code', { error: error.message })
      throw new Error('Failed to authenticate with Gmail')
    }
  }

  /**
   * Set credentials for authenticated requests
   */
  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expiry_date: number
  }> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken })
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      return credentials
    } catch (error: any) {
      logger.error('Failed to refresh access token', { error: error.message })
      throw new Error('Failed to refresh Gmail access token')
    }
  }

  /**
   * Sync messages from Gmail
   */
  async syncMessages(options: EmailSyncOptions = {}): Promise<EmailMessage[]> {
    try {
      const {
        maxResults = 100,
        syncFrom,
        includeSpam = false,
        labels = [],
      } = options

      let query = ''
      if (syncFrom) {
        const date = Math.floor(syncFrom.getTime() / 1000)
        query += `after:${date} `
      }
      if (!includeSpam) {
        query += '-in:spam '
      }
      if (labels.length > 0) {
        query += labels.map(label => `label:${label}`).join(' ')
      }

      const response: GaxiosResponse<any> = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query.trim(),
      })

      const messages: EmailMessage[] = []

      if (response.data.messages) {
        for (const msg of response.data.messages) {
          const fullMessage = await this.getMessage(msg.id)
          if (fullMessage) {
            messages.push(fullMessage)
          }
        }
      }

      logger.info('Synced messages from Gmail', {
        count: messages.length,
        query,
      })

      return messages
    } catch (error: any) {
      logger.error('Failed to sync Gmail messages', { error: error.message })
      throw new Error('Failed to sync Gmail messages')
    }
  }

  /**
   * Get full message details
   */
  private async getMessage(messageId: string): Promise<EmailMessage | null> {
    try {
      const response: GaxiosResponse<any> = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })

      const message = response.data
      const headers = message.payload.headers

      const getHeader = (name: string) => {
        const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        return header?.value || ''
      }

      const parseAddress = (addressStr: string): EmailAddress => {
        const match = addressStr.match(/^(.*?)\s*<(.+?)>$/)
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() }
        }
        return { email: addressStr.trim() }
      }

      const parseAddresses = (addressStr: string): EmailAddress[] => {
        if (!addressStr) return []
        return addressStr.split(',').map(addr => parseAddress(addr.trim()))
      }

      // Extract body
      let bodyText = ''
      let bodyHtml = ''

      const extractBody = (part: any) => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.parts) {
          part.parts.forEach(extractBody)
        }
      }

      if (message.payload.body.data) {
        bodyText = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
      } else if (message.payload.parts) {
        message.payload.parts.forEach(extractBody)
      }

      return {
        id: '', // Will be set by repository
        accountId: '', // Will be set by service
        tenantId: '', // Will be set by service
        messageId: message.id,
        threadId: message.threadId,
        from: parseAddress(getHeader('From')),
        to: parseAddresses(getHeader('To')),
        cc: parseAddresses(getHeader('Cc')),
        bcc: parseAddresses(getHeader('Bcc')),
        subject: getHeader('Subject'),
        bodyText,
        bodyHtml,
        receivedAt: new Date(parseInt(message.internalDate)),
        isRead: !message.labelIds?.includes('UNREAD'),
        hasAttachments: message.payload.parts?.some((p: any) => p.filename) || false,
        labels: message.labelIds || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    } catch (error: any) {
      logger.error('Failed to get Gmail message', { messageId, error: error.message })
      return null
    }
  }

  /**
   * Send email via Gmail
   */
  async sendEmail(emailData: SendEmailDto): Promise<string> {
    try {
      const { to, cc, bcc, subject, bodyHtml, bodyText, replyTo } = emailData

      const formatAddress = (addr: EmailAddress) => {
        return addr.name ? `${addr.name} <${addr.email}>` : addr.email
      }

      const formatAddresses = (addresses: EmailAddress[]) => {
        return addresses.map(formatAddress).join(', ')
      }

      const email = [
        `To: ${formatAddresses(to)}`,
        cc && cc.length > 0 ? `Cc: ${formatAddresses(cc)}` : '',
        bcc && bcc.length > 0 ? `Bcc: ${formatAddresses(bcc)}` : '',
        replyTo ? `Reply-To: ${formatAddress(replyTo)}` : '',
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        bodyHtml || bodyText || '',
      ]
        .filter(Boolean)
        .join('\n')

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const response: GaxiosResponse<any> = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      })

      logger.info('Sent email via Gmail', {
        messageId: response.data.id,
        to: to.map(a => a.email),
      })

      return response.data.id
    } catch (error: any) {
      logger.error('Failed to send Gmail email', { error: error.message })
      throw new Error('Failed to send email via Gmail')
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      })
    } catch (error: any) {
      logger.error('Failed to mark Gmail message as read', {
        messageId,
        error: error.message,
      })
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<{ email: string; name?: string }> {
    try {
      const response: GaxiosResponse<any> = await this.gmail.users.getProfile({
        userId: 'me',
      })

      return {
        email: response.data.emailAddress,
      }
    } catch (error: any) {
      logger.error('Failed to get Gmail user profile', { error: error.message })
      throw new Error('Failed to get Gmail user profile')
    }
  }
}
