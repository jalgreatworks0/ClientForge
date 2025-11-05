/**
 * Account Types and Interfaces
 * TypeScript type definitions for accounts/companies module
 */

export interface Account {
  id: string
  tenantId: string
  ownerId: string
  name: string
  website?: string
  industry?: string
  companySize?: CompanySize
  annualRevenue?: number
  phone?: string
  email?: string
  description?: string
  accountType?: AccountType
  accountStatus: AccountStatus
  parentAccountId?: string
  tags?: string[]
  billingAddressStreet?: string
  billingAddressCity?: string
  billingAddressState?: string
  billingAddressPostalCode?: string
  billingAddressCountry?: string
  shippingAddressStreet?: string
  shippingAddressCity?: string
  shippingAddressState?: string
  shippingAddressPostalCode?: string
  shippingAddressCountry?: string
  socialLinkedin?: string
  socialTwitter?: string
  socialFacebook?: string
  employeeCount?: number
  foundedYear?: number
  stockSymbol?: string
  isActive: boolean
  lastActivityAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small', // 1-50
  MEDIUM = 'medium', // 51-250
  LARGE = 'large', // 251-1000
  ENTERPRISE = 'enterprise', // 1001+
}

export enum AccountType {
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
  PARTNER = 'partner',
  COMPETITOR = 'competitor',
  VENDOR = 'vendor',
  RESELLER = 'reseller',
  OTHER = 'other',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  CHURNED = 'churned',
}

export interface CreateAccountInput {
  ownerId: string
  name: string
  website?: string
  industry?: string
  companySize?: CompanySize
  annualRevenue?: number
  phone?: string
  email?: string
  description?: string
  accountType?: AccountType
  accountStatus?: AccountStatus
  parentAccountId?: string
  tags?: string[]
  billingAddressStreet?: string
  billingAddressCity?: string
  billingAddressState?: string
  billingAddressPostalCode?: string
  billingAddressCountry?: string
  shippingAddressStreet?: string
  shippingAddressCity?: string
  shippingAddressState?: string
  shippingAddressPostalCode?: string
  shippingAddressCountry?: string
  socialLinkedin?: string
  socialTwitter?: string
  socialFacebook?: string
  employeeCount?: number
  foundedYear?: number
  stockSymbol?: string
}

export interface UpdateAccountInput {
  ownerId?: string
  name?: string
  website?: string
  industry?: string
  companySize?: CompanySize
  annualRevenue?: number
  phone?: string
  email?: string
  description?: string
  accountType?: AccountType
  accountStatus?: AccountStatus
  parentAccountId?: string
  tags?: string[]
  billingAddressStreet?: string
  billingAddressCity?: string
  billingAddressState?: string
  billingAddressPostalCode?: string
  billingAddressCountry?: string
  shippingAddressStreet?: string
  shippingAddressCity?: string
  shippingAddressState?: string
  shippingAddressPostalCode?: string
  shippingAddressCountry?: string
  socialLinkedin?: string
  socialTwitter?: string
  socialFacebook?: string
  employeeCount?: number
  foundedYear?: number
  stockSymbol?: string
  isActive?: boolean
  lastActivityAt?: Date
}

export interface AccountFilters {
  search?: string
  ownerId?: string
  industry?: string
  companySize?: CompanySize | CompanySize[]
  accountType?: AccountType | AccountType[]
  accountStatus?: AccountStatus | AccountStatus[]
  revenueMin?: number
  revenueMax?: number
  tags?: string[]
  isActive?: boolean
  createdAfter?: Date
  createdBefore?: Date
  lastActivityAfter?: Date
  lastActivityBefore?: Date
  parentAccountId?: string
  hasParent?: boolean
}

export interface AccountListOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: AccountFilters
}

export interface AccountListResponse {
  accounts: Account[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BulkAccountOperation {
  accountIds: string[]
  operation: 'update' | 'delete' | 'assign' | 'add_tags' | 'remove_tags' | 'change_status'
  data?: Record<string, any>
}

export interface AccountActivity {
  id: string
  accountId: string
  activityType: string
  title: string
  description?: string
  performedBy: string
  createdAt: Date
}

export interface AccountNote {
  id: string
  accountId: string
  content: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Full account with related data
export interface AccountWithRelations extends Account {
  owner?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  parentAccount?: {
    id: string
    name: string
    industry?: string
  }
  childAccounts?: Array<{
    id: string
    name: string
    accountType?: AccountType
  }>
  customFields?: Array<{
    fieldId: string
    fieldName: string
    fieldLabel: string
    value: any
  }>
  contactCount?: number
  dealCount?: number
  totalDealValue?: number
  recentActivities?: AccountActivity[]
}

// Search result with highlighting
export interface AccountSearchResult {
  account: Account
  relevanceScore: number
  highlightedFields: Record<string, string>
}

// Statistics/metrics
export interface AccountStatistics {
  totalAccounts: number
  activeAccounts: number
  byAccountType: Record<AccountType, number>
  byAccountStatus: Record<AccountStatus, number>
  byCompanySize: Record<CompanySize, number>
  byIndustry: Record<string, number>
  totalRevenue: number
  averageRevenue: number
  accountsWithActivity30Days: number
  newAccountsThisMonth: number
  churnRate: number
}

// Import/Export types
export interface AccountImportRow {
  name: string
  website?: string
  industry?: string
  phone?: string
  email?: string
  [key: string]: any // Allow custom fields
}

export interface AccountImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    message: string
    data: AccountImportRow
  }>
}

export interface AccountExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  fields?: string[]
  filters?: AccountFilters
  includeCustomFields?: boolean
  includeContacts?: boolean
  includeDeals?: boolean
}

// Hierarchy types
export interface AccountHierarchy {
  account: Account
  children: AccountHierarchy[]
  depth: number
}
