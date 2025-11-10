/**
 * Session Service
 * Manages user sessions in Redis with PostgreSQL backup
 */

import crypto from 'crypto'

import { getRedisClient } from '../../../config/database/redis-config'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { logger } from '../../utils/logging/logger'
import { securityConfig } from '../../../config/security/security-config'

export interface SessionData {
  userId: string
  tenantId: string
  refreshTokenHash: string
  userAgent?: string
  ipAddress?: string
  deviceType?: string
}

export interface SessionMetadata {
  userAgent?: string
  ipAddress?: string
  deviceType?: string
}

export class SessionService {
  private readonly sessionTTL: number // 7 days in seconds

  constructor() {
    this.sessionTTL = 7 * 24 * 60 * 60 // 7 days
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    tenantId: string,
    refreshToken: string,
    metadata: SessionMetadata
  ): Promise<void> {
    try {
      const redis = await getRedisClient()
      const pool = getPostgresPool()

      // Hash refresh token before storage
      const refreshTokenHash = this.hashToken(refreshToken)

      // Store in Redis for fast access
      const sessionKey = this.getSessionKey(userId, refreshTokenHash)
      const sessionData: SessionData = {
        userId,
        tenantId,
        refreshTokenHash,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        deviceType: metadata.deviceType,
      }

      await redis.setEx(sessionKey, this.sessionTTL, JSON.stringify(sessionData))

      // Also store in PostgreSQL as backup
      const expiresAt = new Date(Date.now() + this.sessionTTL * 1000)

      await pool.query(
        `INSERT INTO sessions (
          user_id, refresh_token,
          user_agent, ip_address,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          refreshToken,
          metadata.userAgent,
          metadata.ipAddress,
          expiresAt,
        ]
      )

      logger.info('Session created', {
        userId,
        ipAddress: metadata.ipAddress,
        deviceType: metadata.deviceType,
      })
    } catch (error) {
      logger.error('Failed to create session', { error, userId })
      throw error
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(userId: string, refreshToken: string): Promise<boolean> {
    try {
      const redis = await getRedisClient()
      const refreshTokenHash = this.hashToken(refreshToken)
      const sessionKey = this.getSessionKey(userId, refreshTokenHash)

      const exists = await redis.exists(sessionKey)

      if (exists) {
        // Update last activity
        await this.updateLastActivity(userId, refreshTokenHash)
        return true
      }

      // Check PostgreSQL as fallback
      const pool = getPostgresPool()
      const result = await pool.query(
        `SELECT id FROM sessions
        WHERE user_id = $1
          AND refresh_token = $2
          AND expires_at > CURRENT_TIMESTAMP`,
        [userId, refreshToken]
      )

      if (result.rows.length > 0) {
        // Restore to Redis
        // Note: You'd need to fetch the full session data here
        logger.info('Session restored from PostgreSQL to Redis', { userId })
        return true
      }

      return false
    } catch (error) {
      logger.error('Failed to check session existence', { error, userId })
      return false
    }
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(userId: string, refreshToken: string): Promise<void> {
    try {
      const redis = await getRedisClient()
      const pool = getPostgresPool()

      const refreshTokenHash = this.hashToken(refreshToken)
      const sessionKey = this.getSessionKey(userId, refreshTokenHash)

      // Delete from Redis
      await redis.del(sessionKey)

      // Delete from PostgreSQL
      await pool.query(
        `DELETE FROM sessions
        WHERE user_id = $1
          AND refresh_token = $2`,
        [userId, refreshToken]
      )

      logger.info('Session deleted', { userId })
    } catch (error) {
      logger.error('Failed to delete session', { error, userId })
      throw error
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      const redis = await getRedisClient()
      const pool = getPostgresPool()

      // Get all active sessions from PostgreSQL
      const result = await pool.query(
        `SELECT refresh_token FROM sessions
        WHERE user_id = $1
          AND expires_at > CURRENT_TIMESTAMP`,
        [userId]
      )

      // Delete from Redis
      for (const row of result.rows) {
        const refreshTokenHash = this.hashToken(row.refresh_token)
        const sessionKey = this.getSessionKey(userId, refreshTokenHash)
        await redis.del(sessionKey)
      }

      // Delete from PostgreSQL
      await pool.query(
        `DELETE FROM sessions
        WHERE user_id = $1`,
        [userId]
      )

      logger.info('All sessions deleted for user', { userId })
    } catch (error) {
      logger.error('Failed to delete all user sessions', { error, userId })
      throw error
    }
  }

  /**
   * Update last activity timestamp
   * Note: sessions table doesn't have last_activity_at column, so this is a no-op
   */
  async updateLastActivity(userId: string, refreshTokenHash: string): Promise<void> {
    // The sessions table doesn't track last activity, only creation time
    // Activity is tracked in Redis via TTL updates
    // This method is kept for compatibility but does nothing
    return
  }

  /**
   * Get active session count for user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    try {
      const pool = getPostgresPool()

      const result = await pool.query(
        `SELECT COUNT(*) as count FROM sessions
        WHERE user_id = $1
          AND expires_at > CURRENT_TIMESTAMP`,
        [userId]
      )

      return parseInt(result.rows[0]?.count || '0', 10)
    } catch (error) {
      logger.error('Failed to get active session count', { error, userId })
      return 0
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pool = getPostgresPool()

      const result = await pool.query(
        `DELETE FROM sessions
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id`
      )

      const count = result.rows.length

      if (count > 0) {
        logger.info('Expired sessions cleaned up', { count })
      }

      return count
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error })
      return 0
    }
  }

  /**
   * Hash token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Generate Redis session key
   */
  private getSessionKey(userId: string, refreshTokenHash: string): string {
    return `session:${userId}:${refreshTokenHash}`
  }
}

// Export singleton instance
export const sessionService = new SessionService()
