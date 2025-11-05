/**
 * Unit Tests: JwtService
 * Tests for JWT token generation and verification
 */

import { JwtService } from '../../../backend/core/auth/jwt-service'
import jwt from 'jsonwebtoken'
import { AppError } from '../../../backend/utils/errors/app-error'

// Mock jsonwebtoken
jest.mock('jsonwebtoken')
const mockedJwt = jwt as jest.Mocked<typeof jwt>

describe('JwtService', () => {
  let jwtService: JwtService
  const JWT_SECRET = 'test-secret-key'
  const JWT_REFRESH_SECRET = 'test-refresh-secret-key'
  const JWT_EXPIRY = '15m'
  const JWT_REFRESH_EXPIRY = '7d'

  beforeEach(() => {
    // Set environment variables
    process.env.JWT_SECRET = JWT_SECRET
    process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET
    process.env.JWT_EXPIRY = JWT_EXPIRY
    process.env.JWT_REFRESH_EXPIRY = JWT_REFRESH_EXPIRY

    jwtService = new JwtService()

    // Reset mocks
    jest.clearAllMocks()
  })

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      const expectedToken = 'generated-access-token'
      mockedJwt.sign.mockReturnValue(expectedToken as any)

      const result = jwtService.generateAccessToken(payload)

      expect(result).toBe(expectedToken)
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        JWT_SECRET,
        {
          expiresIn: JWT_EXPIRY,
          issuer: 'clientforge-crm',
          audience: 'clientforge-api',
        }
      )
    })

    it('should include all required claims in token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-admin',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      jwtService.generateAccessToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const tokenPayload = signCall[0] as typeof payload

      expect(tokenPayload.userId).toBe('user-123')
      expect(tokenPayload.tenantId).toBe('tenant-123')
      expect(tokenPayload.roleId).toBe('role-admin')
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token with session ID', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        sessionId: 'session-456',
      }

      const expectedToken = 'generated-refresh-token'
      mockedJwt.sign.mockReturnValue(expectedToken as any)

      const result = jwtService.generateRefreshToken(payload)

      expect(result).toBe(expectedToken)
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        JWT_REFRESH_SECRET,
        {
          expiresIn: JWT_REFRESH_EXPIRY,
          issuer: 'clientforge-crm',
          audience: 'clientforge-api',
        }
      )
    })

    it('should include sessionId in refresh token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        sessionId: 'session-789',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      jwtService.generateRefreshToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const tokenPayload = signCall[0] as typeof payload

      expect(tokenPayload.sessionId).toBe('session-789')
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', () => {
      const token = 'valid-access-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      }

      mockedJwt.verify.mockReturnValue(decodedPayload as any)

      const result = jwtService.verifyAccessToken(token)

      expect(result).toEqual(decodedPayload)
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, JWT_SECRET, {
        issuer: 'clientforge-crm',
        audience: 'clientforge-api',
      })
    })

    it('should throw error if token is expired', () => {
      const token = 'expired-token'
      const error = new jwt.TokenExpiredError('jwt expired', new Date())

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow(
        new AppError('Token has expired', 401)
      )
    })

    it('should throw error if token is invalid', () => {
      const token = 'invalid-token'
      const error = new jwt.JsonWebTokenError('invalid token')

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow(
        new AppError('Invalid token', 401)
      )
    })

    it('should throw error if token signature is invalid', () => {
      const token = 'tampered-token'
      const error = new jwt.JsonWebTokenError('invalid signature')

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow(
        new AppError('Invalid token', 401)
      )
    })

    it('should throw error for malformed token', () => {
      const token = 'malformed.token'
      const error = new jwt.JsonWebTokenError('jwt malformed')

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow(
        new AppError('Invalid token', 401)
      )
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', () => {
      const token = 'valid-refresh-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        sessionId: 'session-456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
      }

      mockedJwt.verify.mockReturnValue(decodedPayload as any)

      const result = jwtService.verifyRefreshToken(token)

      expect(result).toEqual(decodedPayload)
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, JWT_REFRESH_SECRET, {
        issuer: 'clientforge-crm',
        audience: 'clientforge-api',
      })
    })

    it('should throw error if refresh token is expired', () => {
      const token = 'expired-refresh-token'
      const error = new jwt.TokenExpiredError('jwt expired', new Date())

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyRefreshToken(token)).toThrow(
        new AppError('Refresh token has expired', 401)
      )
    })

    it('should throw error if refresh token is invalid', () => {
      const token = 'invalid-refresh-token'
      const error = new jwt.JsonWebTokenError('invalid token')

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyRefreshToken(token)).toThrow(
        new AppError('Invalid refresh token', 401)
      )
    })
  })

  describe('decodeToken', () => {
    it('should decode token without verifying', () => {
      const token = 'some-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.decode.mockReturnValue(decodedPayload as any)

      const result = jwtService.decodeToken(token)

      expect(result).toEqual(decodedPayload)
      expect(mockedJwt.decode).toHaveBeenCalledWith(token)
    })

    it('should return null for invalid token format', () => {
      const token = 'invalid-token'

      mockedJwt.decode.mockReturnValue(null)

      const result = jwtService.decodeToken(token)

      expect(result).toBeNull()
    })
  })

  describe('getTokenExpiry', () => {
    it('should extract expiry time from decoded token', () => {
      const expiryTime = Math.floor(Date.now() / 1000) + 900 // 15 minutes
      const token = 'some-token'
      const decodedPayload = {
        userId: 'user-123',
        exp: expiryTime,
      }

      mockedJwt.decode.mockReturnValue(decodedPayload as any)

      const result = jwtService.getTokenExpiry(token)

      expect(result).toBe(expiryTime)
    })

    it('should return null if token has no expiry', () => {
      const token = 'some-token'
      const decodedPayload = {
        userId: 'user-123',
      }

      mockedJwt.decode.mockReturnValue(decodedPayload as any)

      const result = jwtService.getTokenExpiry(token)

      expect(result).toBeNull()
    })

    it('should return null for invalid token', () => {
      const token = 'invalid-token'

      mockedJwt.decode.mockReturnValue(null)

      const result = jwtService.getTokenExpiry(token)

      expect(result).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 900
      const token = 'valid-token'
      const decodedPayload = {
        userId: 'user-123',
        exp: futureExpiry,
      }

      mockedJwt.decode.mockReturnValue(decodedPayload as any)

      const result = jwtService.isTokenExpired(token)

      expect(result).toBe(false)
    })

    it('should return true for expired token', () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 100
      const token = 'expired-token'
      const decodedPayload = {
        userId: 'user-123',
        exp: pastExpiry,
      }

      mockedJwt.decode.mockReturnValue(decodedPayload as any)

      const result = jwtService.isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should return true for token without expiry', () => {
      const token = 'token-no-exp'
      const decodedPayload = {
        userId: 'user-123',
      }

      mockedJwt.decode.mockReturnValue(decodedPayload as any)

      const result = jwtService.isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should return true for invalid token', () => {
      const token = 'invalid-token'

      mockedJwt.decode.mockReturnValue(null)

      const result = jwtService.isTokenExpired(token)

      expect(result).toBe(true)
    })
  })
})
