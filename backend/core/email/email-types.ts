/**
 * Email Service Types
 * Definitions for email integration with Gmail and Outlook
 */

export interface EmailProvider {
  type: 'gmail' | 'outlook'
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export interface EmailAccount {
  id: string
  userId: string
  tenantId: string
  provider: 'gmail' | 'outlook'
  email: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
  isActive: boolean
  syncEnabled: boolean
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface EmailMessage {
  id: string
  accountId: string
  tenantId: string
  messageId: string // Provider message ID
  threadId?: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  receivedAt: Date
  sentAt?: Date
  isRead: boolean
  hasAttachments: boolean
  labels?: string[]
  contactId?: string // Linked CRM contact
  dealId?: string // Linked CRM deal
  createdAt: Date
  updatedAt: Date
}

export interface EmailAddress {
  name?: string
  email: string
}

export interface EmailAttachment {
  id: string
  messageId: string
  filename: string
  contentType: string
  size: number
  attachmentId: string // Provider attachment ID
  url?: string
}

export interface EmailSyncOptions {
  maxResults?: number
  syncFrom?: Date
  includeSpam?: boolean
  includeDraft?: boolean
  labels?: string[]
}

export interface EmailTrackingData {
  id: string
  messageId: string
  tenantId: string
  sentTo: string
  sentAt: Date
  openedAt?: Date
  openCount: number
  clickedAt?: Date
  clickCount: number
  links: string[]
  userAgent?: string
  ipAddress?: string
}

export interface SendEmailDto {
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  bodyHtml?: string
  bodyText?: string
  attachments?: EmailAttachment[]
  replyTo?: EmailAddress
  trackOpens?: boolean
  trackClicks?: boolean
}

export interface EmailSearchFilters {
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  isRead?: boolean
  dateFrom?: Date
  dateTo?: Date
  labels?: string[]
  contactId?: string
  dealId?: string
}

export interface EmailSyncStatus {
  accountId: string
  isRunning: boolean
  lastSyncAt?: Date
  nextSyncAt?: Date
  messagesSynced: number
  errors?: string[]
}

export interface GmailAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface OutlookAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  tenantId: string
}
