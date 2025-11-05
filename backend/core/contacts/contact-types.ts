/**
 * Contact Types and Interfaces
 * TypeScript type definitions for contacts module
 */

export interface Contact {
  id: string
  tenantId: string
  ownerId: string
  accountId?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  mobile?: string
  title?: string
  department?: string
  leadSource?: string
  leadStatus: LeadStatus
  lifecycleStage: LifecycleStage
  leadScore: number
  tags?: string[]
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressPostalCode?: string
  addressCountry?: string
  socialLinkedin?: string
  socialTwitter?: string
  socialFacebook?: string
  notes?: string
  isActive: boolean
  lastContactedAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
}

export enum LifecycleStage {
  LEAD = 'lead',
  MQL = 'mql', // Marketing Qualified Lead
  SQL = 'sql', // Sales Qualified Lead
  OPPORTUNITY = 'opportunity',
  CUSTOMER = 'customer',
  EVANGELIST = 'evangelist',
  OTHER = 'other',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  EVENT = 'event',
  COLD_CALL = 'cold_call',
  PARTNER = 'partner',
  OTHER = 'other',
}

export interface CreateContactInput {
  ownerId: string
  accountId?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  mobile?: string
  title?: string
  department?: string
  leadSource?: string
  leadStatus?: LeadStatus
  lifecycleStage?: LifecycleStage
  tags?: string[]
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressPostalCode?: string
  addressCountry?: string
  socialLinkedin?: string
  socialTwitter?: string
  socialFacebook?: string
  notes?: string
}

export interface UpdateContactInput {
  ownerId?: string
  accountId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  mobile?: string
  title?: string
  department?: string
  leadSource?: string
  leadStatus?: LeadStatus
  lifecycleStage?: LifecycleStage
  leadScore?: number
  tags?: string[]
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressPostalCode?: string
  addressCountry?: string
  socialLinkedin?: string
  socialTwitter?: string
  socialFacebook?: string
  notes?: string
  isActive?: boolean
  lastContactedAt?: Date
}

export interface ContactFilters {
  search?: string
  ownerId?: string
  accountId?: string
  leadStatus?: LeadStatus | LeadStatus[]
  lifecycleStage?: LifecycleStage | LifecycleStage[]
  leadScoreMin?: number
  leadScoreMax?: number
  tags?: string[]
  isActive?: boolean
  createdAfter?: Date
  createdBefore?: Date
  lastContactedAfter?: Date
  lastContactedBefore?: Date
}

export interface ContactListOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: ContactFilters
}

export interface ContactListResponse {
  contacts: Contact[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BulkContactOperation {
  contactIds: string[]
  operation: 'update' | 'delete' | 'assign' | 'add_tags' | 'remove_tags'
  data?: Record<string, any>
}

export interface ContactActivity {
  id: string
  contactId: string
  activityType: string
  title: string
  description?: string
  performedBy: string
  createdAt: Date
}

export interface ContactNote {
  id: string
  contactId: string
  content: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Full contact with related data
export interface ContactWithRelations extends Contact {
  owner?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  account?: {
    id: string
    name: string
    industry?: string
  }
  customFields?: Array<{
    fieldId: string
    fieldName: string
    fieldLabel: string
    value: any
  }>
  recentActivities?: ContactActivity[]
  dealCount?: number
  totalDealValue?: number
}

// Search result with highlighting
export interface ContactSearchResult {
  contact: Contact
  relevanceScore: number
  highlightedFields: Record<string, string>
}

// Statistics/metrics
export interface ContactStatistics {
  totalContacts: number
  activeContacts: number
  byLeadStatus: Record<LeadStatus, number>
  byLifecycleStage: Record<LifecycleStage, number>
  averageLeadScore: number
  contactedLast30Days: number
  newContactsThisMonth: number
  conversionRate: number
}

// Import/Export types
export interface ContactImportRow {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  title?: string
  company?: string
  [key: string]: any // Allow custom fields
}

export interface ContactImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    message: string
    data: ContactImportRow
  }>
}

export interface ContactExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  fields?: string[]
  filters?: ContactFilters
  includeCustomFields?: boolean
}
