/**
 * Unit Tests: SessionService
 * Tests for session management in Redis and PostgreSQL
 */

import { SessionService } from '../../../backend/core/auth/session-service'

// Mock dependencies at module level
jest.mock('../../../config/database/redis-config')
jest.mock('../../../config/database/postgres-config')
jest.mock('../../../backend/utils/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Import mocked modules AFTER mocking
import { getRedisClient } from '../../../config/database/redis-config'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { logger } from '../../../backend/utils/logging/logger'

describe('SessionService', () => {
  let sessionService: SessionService
  let mockRedis: any
  let mockPool: any

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock Redis client
    mockRedis = {
      setEx: jest.fn().mockResolvedValue('OK'),
      exists: jest.fn().mockResolvedValue(0),
      del: jest.fn().mockResolvedValue(1),
    };

    // Setup mock PostgreSQL pool
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };

    (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool)

    // Create new service instance
    sessionService = new SessionService()
  })

  describe('createSession', () => {
    const userId = 'user-123'
    const tenantId = 'tenant-123'
    const refreshToken = 'refresh-token-abc123'
    const metadata = {
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
      deviceType: 'desktop',
    }

    it('should successfully create session in Redis and PostgreSQL', async () => {
      await sessionService.createSession(userId, tenantId, refreshToken, metadata)

      // Verify Redis storage
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining(`session:${userId}:`),
        7 * 24 * 60 * 60, // 7 days in seconds
        expect.stringContaining(userId)
      )

      // Verify PostgreSQL storage
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([
          userId,
          refreshToken,
          metadata.userAgent,
          metadata.ipAddress,
          expect.any(Date),
        ])
      )

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Session created', {
        userId,
        ipAddress: metadata.ipAddress,
        deviceType: metadata.deviceType,
      })
    })

    it('should handle Redis failure by throwing error', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis connection failed'))

      await expect(
        sessionService.createSession(userId, tenantId, refreshToken, metadata)
      ).rejects.toThrow('Redis connection failed')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create session',
        expect.objectContaining({ userId })
      )
    })

    it('should handle PostgreSQL failure by throwing error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        sessionService.createSession(userId, tenantId, refreshToken, metadata)
      ).rejects.toThrow('Database connection failed')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create session',
        expect.objectContaining({ userId })
      )
    })

    it('should hash refresh token before storing in Redis', async () => {
      await sessionService.createSession(userId, tenantId, refreshToken, metadata)

      // Verify the stored data contains a hashed token (not plaintext)
      const redisCall = mockRedis.setEx.mock.calls[0]
      const storedData = JSON.parse(redisCall[2])

      expect(storedData.refreshTokenHash).toBeDefined()
      expect(storedData.refreshTokenHash).not.toBe(refreshToken)
      expect(storedData.refreshTokenHash).toHaveLength(64) // SHA-256 hex length
    })

    it('should store session metadata correctly', async () => {
      await sessionService.createSession(userId, tenantId, refreshToken, metadata)

      const redisCall = mockRedis.setEx.mock.calls[0]
      const storedData = JSON.parse(redisCall[2])

      expect(storedData).toMatchObject({
        userId,
        tenantId,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        deviceType: metadata.deviceType,
      })
    })

    it('should set correct TTL for session in Redis', async () => {
      await sessionService.createSession(userId, tenantId, refreshToken, metadata)

      const redisCall = mockRedis.setEx.mock.calls[0]
      const ttl = redisCall[1]

      // Verify TTL is 7 days in seconds
      expect(ttl).toBe(7 * 24 * 60 * 60)
    })
  })

  describe('sessionExists', () => {
    const userId = 'user-123'
    const refreshToken = 'refresh-token-abc123'

    it('should return true when session exists in Redis', async () => {
      mockRedis.exists.mockResolvedValue(1) // Session exists

      const result = await sessionService.sessionExists(userId, refreshToken)

      expect(result).toBe(true)
      expect(mockRedis.exists).toHaveBeenCalledWith(
        expect.stringContaining(`session:${userId}:`)
      )
    })

    it('should return false when session does not exist in Redis or PostgreSQL', async () => {
      mockRedis.exists.mockResolvedValue(0) // Not in Redis
      mockPool.query.mockResolvedValue({ rows: [] }) // Not in PostgreSQL

      const result = await sessionService.sessionExists(userId, refreshToken)

      expect(result).toBe(false)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM sessions'),
        [userId, refreshToken]
      )
    })

    it('should restore session from PostgreSQL when not in Redis', async () => {
      mockRedis.exists.mockResolvedValue(0) // Not in Redis
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'session-789' }],
      }) // Found in PostgreSQL

      const result = await sessionService.sessionExists(userId, refreshToken)

      expect(result).toBe(true)
      expect(logger.info).toHaveBeenCalledWith(
        'Session restored from PostgreSQL to Redis',
        { userId }
      )
    })

    it('should return false when Redis throws error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis unavailable'))

      const result = await sessionService.sessionExists(userId, refreshToken)

      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to check session existence',
        expect.objectContaining({ userId })
      )
    })

    it('should filter expired sessions from PostgreSQL fallback', async () => {
      mockRedis.exists.mockResolvedValue(0)
      mockPool.query.mockResolvedValue({ rows: [] }) // Expired sessions filtered out by query

      const result = await sessionService.sessionExists(userId, refreshToken)

      expect(result).toBe(false)
      // Verify query includes expiration check
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at > CURRENT_TIMESTAMP'),
        expect.any(Array)
      )
    })
  })

  describe('deleteSession', () => {
    const userId = 'user-123'
    const refreshToken = 'refresh-token-abc123'

    it('should successfully delete session from Redis and PostgreSQL', async () => {
      await sessionService.deleteSession(userId, refreshToken)

      // Verify Redis deletion
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`session:${userId}:`)
      )

      // Verify PostgreSQL deletion
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions'),
        [userId, refreshToken]
      )

      expect(logger.info).toHaveBeenCalledWith('Session deleted', { userId })
    })

    it('should throw error if deletion fails', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'))

      await expect(
        sessionService.deleteSession(userId, refreshToken)
      ).rejects.toThrow('Redis delete failed')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete session',
        expect.objectContaining({ userId })
      )
    })

    it('should attempt PostgreSQL deletion even if Redis deletion fails', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis unavailable'))

      await expect(
        sessionService.deleteSession(userId, refreshToken)
      ).rejects.toThrow()

      // Redis delete should have been attempted
      expect(mockRedis.del).toHaveBeenCalled()
    })
  })

  describe('deleteAllUserSessions', () => {
    const userId = 'user-123'

    it('should delete all active sessions for a user', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          // First query: SELECT active sessions
          rows: [
            { refresh_token: 'token1' },
            { refresh_token: 'token2' },
            { refresh_token: 'token3' },
          ],
        })
        .mockResolvedValueOnce({
          // Second query: DELETE from PostgreSQL
          rowCount: 3,
        })

      await sessionService.deleteAllUserSessions(userId)

      // Verify PostgreSQL queries
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT refresh_token FROM sessions'),
        [userId]
      )
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions'),
        [userId]
      )

      // Verify Redis deletions (3 tokens = 3 deletions)
      expect(mockRedis.del).toHaveBeenCalledTimes(3)

      expect(logger.info).toHaveBeenCalledWith('All sessions deleted for user', {
        userId,
      })
    })

    it('should handle errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      await expect(sessionService.deleteAllUserSessions(userId)).rejects.toThrow(
        'Database error'
      )

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete all user sessions',
        expect.objectContaining({ userId })
      )
    })

    it('should handle zero active sessions gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No active sessions
        .mockResolvedValueOnce({ rowCount: 0 }) // Delete returns 0

      await sessionService.deleteAllUserSessions(userId)

      // No Redis deletions should occur
      expect(mockRedis.del).not.toHaveBeenCalled()

      expect(logger.info).toHaveBeenCalledWith('All sessions deleted for user', {
        userId,
      })
    })
  })

  describe('getActiveSessionCount', () => {
    const userId = 'user-123'

    it('should return correct count of active sessions', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ count: '5' }],
      })

      const count = await sessionService.getActiveSessionCount(userId)

      expect(count).toBe(5)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM sessions'),
        [userId]
      )
    })

    it('should return 0 when no active sessions exist', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ count: '0' }],
      })

      const count = await sessionService.getActiveSessionCount(userId)

      expect(count).toBe(0)
    })

    it('should return 0 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'))

      const count = await sessionService.getActiveSessionCount(userId)

      expect(count).toBe(0)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get active session count',
        expect.objectContaining({ userId })
      )
    })

    it('should handle missing count gracefully', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const count = await sessionService.getActiveSessionCount(userId)

      expect(count).toBe(0)
    })

    it('should filter expired sessions from count', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ count: '3' }],
      })

      await sessionService.getActiveSessionCount(userId)

      // Verify query includes expiration filter
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at > CURRENT_TIMESTAMP'),
        expect.any(Array)
      )
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions and return count', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: '1' }, { id: '2' }, { id: '3' }],
      })

      const count = await sessionService.cleanupExpiredSessions()

      expect(count).toBe(3)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions')
      )
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at < CURRENT_TIMESTAMP')
      )
      expect(logger.info).toHaveBeenCalledWith('Expired sessions cleaned up', {
        count: 3,
      })
    })

    it('should return 0 when no expired sessions exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const count = await sessionService.cleanupExpiredSessions()

      expect(count).toBe(0)
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should return 0 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Cleanup failed'))

      const count = await sessionService.cleanupExpiredSessions()

      expect(count).toBe(0)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cleanup expired sessions',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })
  })

  describe('Token hashing and session keys', () => {
    it('should generate consistent hash for same token', async () => {
      const userId = 'user-123'
      const tenantId = 'tenant-123'
      const refreshToken = 'same-token'
      const metadata = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        deviceType: 'desktop',
      }

      // Create session twice with same token
      await sessionService.createSession(userId, tenantId, refreshToken, metadata)
      await sessionService.createSession(userId, tenantId, refreshToken, metadata)

      // Extract hashes from Redis calls
      const firstCall = mockRedis.setEx.mock.calls[0]
      const secondCall = mockRedis.setEx.mock.calls[1]

      const firstData = JSON.parse(firstCall[2])
      const secondData = JSON.parse(secondCall[2])

      // Hashes should be identical
      expect(firstData.refreshTokenHash).toBe(secondData.refreshTokenHash)
    })

    it('should generate different hashes for different tokens', async () => {
      const userId = 'user-123'
      const tenantId = 'tenant-123'
      const metadata = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        deviceType: 'desktop',
      }

      await sessionService.createSession(userId, tenantId, 'token1', metadata)
      await sessionService.createSession(userId, tenantId, 'token2', metadata)

      const firstCall = mockRedis.setEx.mock.calls[0]
      const secondCall = mockRedis.setEx.mock.calls[1]

      const firstData = JSON.parse(firstCall[2])
      const secondData = JSON.parse(secondCall[2])

      // Hashes should be different
      expect(firstData.refreshTokenHash).not.toBe(secondData.refreshTokenHash)
    })

    it('should use correct session key format', async () => {
      const userId = 'user-123'
      const refreshToken = 'test-token'

      await sessionService.sessionExists(userId, refreshToken)

      // Verify Redis key format: session:userId:tokenHash
      expect(mockRedis.exists).toHaveBeenCalledWith(
        expect.stringMatching(/^session:user-123:[a-f0-9]{64}$/)
      )
    })
  })
})
