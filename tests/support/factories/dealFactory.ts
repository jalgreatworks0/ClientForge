/**
 * Deal Factory
 * Create realistic deal/opportunity test data
 */

import { generateId, randomFrom, randomInt, sequence, timestamp } from './genericFactory'

export interface DealOptions {
  id?: string
  tenantId?: string
  accountId?: string
  name?: string
  value?: number
  stage?: string
  probability?: number
  expectedCloseDate?: string
  ownerId?: string
  createdAt?: string
}

export interface Deal {
  id: string
  tenantId: string
  accountId: string
  name: string
  value: number
  currency: string
  stage: string
  probability: number
  expectedCloseDate: string
  actualCloseDate: string | null
  status: 'open' | 'won' | 'lost'
  ownerId: string
  createdAt: string
  updatedAt: string
}

const STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

/**
 * Create a single deal
 */
export function createDeal(options: DealOptions = {}): Deal {
  const seq = sequence()
  const id = options.id ?? generateId('deal')
  const stage = options.stage ?? randomFrom(STAGES.slice(0, 4))

  return {
    id,
    tenantId: options.tenantId ?? 'test_tenant',
    accountId: options.accountId ?? generateId('account'),
    name: options.name ?? `Deal ${seq}`,
    value: options.value ?? randomInt(10000, 500000),
    currency: 'USD',
    stage,
    probability: options.probability ?? (stage === 'Prospecting' ? 10 : stage === 'Qualification' ? 25 : stage === 'Proposal' ? 50 : 75),
    expectedCloseDate: options.expectedCloseDate ?? timestamp(-30), // 30 days in future
    actualCloseDate: null,
    status: 'open',
    ownerId: options.ownerId ?? generateId('user'),
    createdAt: options.createdAt ?? timestamp(45),
    updatedAt: timestamp(),
  }
}

/**
 * Create multiple deals
 */
export function createDeals(count: number, options: DealOptions = {}): Deal[] {
  return Array.from({ length: count }, () => createDeal(options))
}

/**
 * Create a won deal
 */
export function createWonDeal(options: DealOptions = {}): Deal {
  return {
    ...createDeal(options),
    stage: 'Closed Won',
    probability: 100,
    status: 'won',
    actualCloseDate: timestamp(5),
  }
}

/**
 * Create a lost deal
 */
export function createLostDeal(options: DealOptions = {}): Deal {
  return {
    ...createDeal(options),
    stage: 'Closed Lost',
    probability: 0,
    status: 'lost',
    actualCloseDate: timestamp(10),
  }
}
