/**
 * User Factory
 * Create realistic user test data
 */

import { generateId, randomEmail, sequence, timestamp } from './genericFactory'

export interface UserOptions {
  id?: string
  tenantId?: string
  email?: string
  firstName?: string
  lastName?: string
  role?: 'admin' | 'user' | 'guest'
  isActive?: boolean
  emailVerified?: boolean
  createdAt?: string
}

export interface User {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'user' | 'guest'
  isActive: boolean
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Create a single user
 */
export function createUser(options: UserOptions = {}): User {
  const seq = sequence()
  const id = options.id ?? generateId('user')

  return {
    id,
    tenantId: options.tenantId ?? 'test_tenant',
    email: options.email ?? randomEmail('user'),
    firstName: options.firstName ?? `User`,
    lastName: options.lastName ?? `${seq}`,
    role: options.role ?? 'user',
    isActive: options.isActive ?? true,
    emailVerified: options.emailVerified ?? true,
    lastLoginAt: null,
    createdAt: options.createdAt ?? timestamp(10),
    updatedAt: timestamp(),
  }
}

/**
 * Create multiple users
 */
export function createUsers(count: number, options: UserOptions = {}): User[] {
  return Array.from({ length: count }, () => createUser(options))
}

/**
 * Create an admin user
 */
export function createAdminUser(options: UserOptions = {}): User {
  return createUser({
    ...options,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
  })
}

/**
 * Create a test user (default for most tests)
 */
export function createTestUser(): User {
  return createUser({
    id: 'test_user',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
  })
}
