/**
 * Tenant Factory
 * Create realistic tenant test data
 */

import { generateId, sequence, timestamp } from './genericFactory'

export interface TenantOptions {
  id?: string
  name?: string
  subdomain?: string
  plan?: 'free' | 'starter' | 'business' | 'enterprise'
  isActive?: boolean
  maxUsers?: number
  createdAt?: string
  settings?: Record<string, unknown>
}

export interface Tenant {
  id: string
  name: string
  subdomain: string
  plan: 'free' | 'starter' | 'business' | 'enterprise'
  isActive: boolean
  maxUsers: number
  createdAt: string
  updatedAt: string
  settings: Record<string, unknown>
}

/**
 * Create a single tenant
 */
export function createTenant(options: TenantOptions = {}): Tenant {
  const seq = sequence()
  const id = options.id ?? generateId('tenant')

  return {
    id,
    name: options.name ?? `Test Tenant ${seq}`,
    subdomain: options.subdomain ?? `test-tenant-${seq}`,
    plan: options.plan ?? 'starter',
    isActive: options.isActive ?? true,
    maxUsers: options.maxUsers ?? 10,
    createdAt: options.createdAt ?? timestamp(30),
    updatedAt: timestamp(),
    settings: options.settings ?? {
      features: {
        aiAssistant: true,
        advancedReporting: false,
      },
      branding: {
        logo: null,
        primaryColor: '#0066CC',
      },
    },
  }
}

/**
 * Create multiple tenants
 */
export function createTenants(count: number, options: TenantOptions = {}): Tenant[] {
  return Array.from({ length: count }, () => createTenant(options))
}

/**
 * Create a test tenant (default for most tests)
 */
export function createTestTenant(): Tenant {
  return createTenant({
    id: 'test_tenant',
    name: 'Test Tenant',
    subdomain: 'test',
    plan: 'business',
  })
}
