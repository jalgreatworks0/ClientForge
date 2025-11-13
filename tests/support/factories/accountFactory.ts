/**
 * Account Factory
 * Create realistic account (company) test data
 */

import { generateId, randomFrom, sequence, timestamp } from './genericFactory'

export interface AccountOptions {
  id?: string
  tenantId?: string
  name?: string
  industry?: string
  size?: 'small' | 'medium' | 'large' | 'enterprise'
  revenue?: number
  website?: string
  ownerId?: string
  createdAt?: string
}

export interface Account {
  id: string
  tenantId: string
  name: string
  industry: string
  size: 'small' | 'medium' | 'large' | 'enterprise'
  revenue: number | null
  website: string | null
  phone: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    country: string
    postalCode: string | null
  }
  ownerId: string
  createdAt: string
  updatedAt: string
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Consulting',
]

/**
 * Create a single account
 */
export function createAccount(options: AccountOptions = {}): Account {
  const seq = sequence()
  const id = options.id ?? generateId('account')

  return {
    id,
    tenantId: options.tenantId ?? 'test_tenant',
    name: options.name ?? `Test Company ${seq}`,
    industry: options.industry ?? randomFrom(INDUSTRIES),
    size: options.size ?? 'medium',
    revenue: options.revenue ?? null,
    website: options.website ?? `https://company${seq}.example.com`,
    phone: null,
    address: {
      street: null,
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: null,
    },
    ownerId: options.ownerId ?? generateId('user'),
    createdAt: options.createdAt ?? timestamp(60),
    updatedAt: timestamp(),
  }
}

/**
 * Create multiple accounts
 */
export function createAccounts(count: number, options: AccountOptions = {}): Account[] {
  return Array.from({ length: count }, () => createAccount(options))
}

/**
 * Create an enterprise account
 */
export function createEnterpriseAccount(options: AccountOptions = {}): Account {
  return createAccount({
    ...options,
    size: 'enterprise',
    revenue: 50000000,
  })
}
