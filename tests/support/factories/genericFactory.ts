/**
 * Generic Factory Utilities
 * Shared helpers for all factory functions
 */

import { v4 as uuid } from 'uuid'

let sequenceCounter = 1000

/**
 * Generate a unique sequence number for test data
 */
export function sequence(): number {
  return ++sequenceCounter
}

/**
 * Generate a UUID for test entities
 */
export function generateId(prefix?: string): string {
  const id = uuid()
  return prefix ? `${prefix}_${id}` : id
}

/**
 * Generate a random email for testing
 */
export function randomEmail(prefix = 'user'): string {
  return `${prefix}_${sequence()}@test.example.com`
}

/**
 * Generate ISO timestamp (now or past)
 */
export function timestamp(daysAgo = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/**
 * Pick random element from array
 */
export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Reset sequence counter (useful for predictable test data)
 */
export function resetSequence(start = 1000): void {
  sequenceCounter = start
}
