/**
 * Unit Tests: JWTService
 * Tests for JWT token generation and verification
 */

import { JWTService } from '../../../backend/core/auth/jwt-service'
import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../../../backend/utils/errors/app-error'

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../config/security/security-config', () => ({
  securityConfig: {
    jwt: {
      secret: 'test-secret-key',
      algorithm: 'HS256' as const,
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
    },
  },
}));
jest.mock('../../../backend/utils/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWTService', () => {
  let jwtService: JWTService

  beforeEach(() => {
    jwtService = new JWTService()

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
      expect(mockedJwt.sign).toHaveBeenCalled()
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
    it('should generate valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
      }

      const expectedToken = 'generated-refresh-token'
      mockedJwt.sign.mockReturnValue(expectedToken as any)

      const result = jwtService.generateRefreshToken(payload)

      expect(result).toBe(expectedToken)
      expect(mockedJwt.sign).toHaveBeenCalled()
    })

    it('should include jti in refresh token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        jti: 'jti-789',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      jwtService.generateRefreshToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const tokenPayload = signCall[0] as any

      expect(tokenPayload.jti).toBe('jti-789')
      expect(tokenPayload.type).toBe('refresh')
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', () => {
      const token = 'valid-access-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      }

      mockedJwt.verify.mockReturnValue(decodedPayload as any)

      const result = jwtService.verifyAccessToken(token)

      expect(result.userId).toBe('user-123')
      expect(result.tenantId).toBe('tenant-123')
      expect(result.roleId).toBe('role-123')
    })

    it('should throw error if token is expired', () => {
      const token = 'expired-token'
      const error = new jwt.TokenExpiredError('jwt expired', new Date())

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow('Token expired')
    })

    it('should throw error if token is invalid', () => {
      const token = 'invalid-token'
      const error = new jwt.JsonWebTokenError('invalid token')

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow('Invalid token')
    })

    it('should throw error if token type is wrong', () => {
      const token = 'refresh-token-used-as-access'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'refresh', // Wrong type
      }

      mockedJwt.verify.mockReturnValue(decodedPayload as any)

      // Note: The error gets caught and re-thrown as "Token verification failed"
      expect(() => jwtService.verifyAccessToken(token)).toThrow()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', () => {
      const token = 'valid-refresh-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'refresh',
        jti: 'jti-456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
      }

      mockedJwt.verify.mockReturnValue(decodedPayload as any)

      const result = jwtService.verifyRefreshToken(token)

      expect(result.userId).toBe('user-123')
      expect(result.tenantId).toBe('tenant-123')
      expect(result.jti).toBe('jti-456')
    })

    it('should throw error if refresh token is expired', () => {
      const token = 'expired-refresh-token'
      const error = new jwt.TokenExpiredError('jwt expired', new Date())

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyRefreshToken(token)).toThrow('Refresh token expired')
    })

    it('should throw error if refresh token is invalid', () => {
      const token = 'invalid-refresh-token'
      const error = new jwt.JsonWebTokenError('invalid token')

      mockedJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => jwtService.verifyRefreshToken(token)).toThrow('Invalid refresh token')
    })

    it('should throw error if token type is wrong', () => {
      const token = 'access-token-used-as-refresh'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'access', // Wrong type
      }

      mockedJwt.verify.mockReturnValue(decodedPayload as any)

      // Note: The error gets caught and re-thrown as "Token verification failed"
      expect(() => jwtService.verifyRefreshToken(token)).toThrow()
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
})
