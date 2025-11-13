/**
 * Contact Factory
 * Create realistic contact test data
 */

import { generateId, randomEmail, sequence, timestamp } from './genericFactory'

export interface ContactOptions {
  id?: string
  tenantId?: string
  accountId?: string
  firstName?: string
  lastName?: string
  email?: string
  title?: string
  phone?: string
  ownerId?: string
  createdAt?: string
}

export interface Contact {
  id: string
  tenantId: string
  accountId: string | null
  firstName: string
  lastName: string
  email: string
  title: string | null
  phone: string | null
  mobile: string | null
  linkedin: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

const TITLES = [
  'CEO',
  'CTO',
  'CFO',
  'VP of Sales',
  'VP of Engineering',
  'Director of Marketing',
  'Product Manager',
  'Sales Manager',
  'Account Executive',
]

/**
 * Create a single contact
 */
export function createContact(options: ContactOptions = {}): Contact {
  const seq = sequence()
  const id = options.id ?? generateId('contact')
  const firstName = options.firstName ?? `Contact`
  const lastName = options.lastName ?? `${seq}`

  return {
    id,
    tenantId: options.tenantId ?? 'test_tenant',
    accountId: options.accountId ?? null,
    firstName,
    lastName,
    email: options.email ?? randomEmail(firstName.toLowerCase()),
    title: options.title ?? TITLES[seq % TITLES.length],
    phone: options.phone ?? null,
    mobile: null,
    linkedin: null,
    ownerId: options.ownerId ?? generateId('user'),
    createdAt: options.createdAt ?? timestamp(30),
    updatedAt: timestamp(),
  }
}

/**
 * Create multiple contacts
 */
export function createContacts(count: number, options: ContactOptions = {}): Contact[] {
  return Array.from({ length: count }, () => createContact(options))
}

/**
 * Create a contact linked to an account
 */
export function createAccountContact(accountId: string, options: ContactOptions = {}): Contact {
  return createContact({
    ...options,
    accountId,
  })
}
