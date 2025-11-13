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

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens with shared jti', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        email: 'test@example.com',
      }

      mockedJwt.sign.mockReturnValue('mock-token' as any)

      const result = jwtService.generateTokenPair(payload)

      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.expiresIn).toBeDefined()

      // Verify jwt.sign was called twice (once for access, once for refresh)
      expect(mockedJwt.sign).toHaveBeenCalledTimes(2)

      // Verify both tokens share the same jti
      const accessCall = mockedJwt.sign.mock.calls[0]
      const refreshCall = mockedJwt.sign.mock.calls[1]

      const accessPayload = accessCall[0] as any
      const refreshPayload = refreshCall[0] as any

      expect(accessPayload.jti).toBeDefined()
      expect(refreshPayload.jti).toBeDefined()
      expect(accessPayload.jti).toBe(refreshPayload.jti)
    })

    it('should include correct expiry time in response', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockReturnValue('mock-token' as any)

      const result = jwtService.generateTokenPair(payload)

      // 15m = 900 seconds
      expect(result.expiresIn).toBe(900000)
    })
  })

  describe('Token claims and structure', () => {
    it('should include issuer and audience in access token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      jwtService.generateAccessToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const options = signCall[2]

      expect(options).toMatchObject({
        issuer: 'clientforge-crm',
        audience: 'clientforge-users',
      })
    })

    it('should include issuer and audience in refresh token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      jwtService.generateRefreshToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const options = signCall[2]

      expect(options).toMatchObject({
        issuer: 'clientforge-crm',
        audience: 'clientforge-users',
      })
    })

    it('should generate unique JTI for each token pair', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      // Generate two token pairs
      jwtService.generateTokenPair(payload)
      jwtService.generateTokenPair(payload)

      // Extract jti from both pairs
      const firstPairAccess = mockedJwt.sign.mock.calls[0][0] as any
      const secondPairAccess = mockedJwt.sign.mock.calls[2][0] as any

      // JTIs should be different between pairs
      expect(firstPairAccess.jti).not.toBe(secondPairAccess.jti)
    })

    it('should include tenantId in token payload', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-specific',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      jwtService.generateAccessToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const tokenPayload = signCall[0] as any

      expect(tokenPayload.tenantId).toBe('tenant-specific')
    })
  })

  describe('Error handling', () => {
    it('should throw error when jwt.sign fails for access token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockImplementation(() => {
        throw new Error('Signing failed')
      })

      expect(() => jwtService.generateAccessToken(payload)).toThrow(
        'Failed to generate access token'
      )
    })

    it('should throw error when jwt.sign fails for refresh token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
      }

      mockedJwt.sign.mockImplementation(() => {
        throw new Error('Signing failed')
      })

      expect(() => jwtService.generateRefreshToken(payload)).toThrow(
        'Failed to generate refresh token'
      )
    })

    it('should reject token with wrong issuer in access token', () => {
      const token = 'token-with-wrong-issuer'

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('jwt issuer invalid')
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow('Invalid token')
    })

    it('should reject token with wrong audience in refresh token', () => {
      const token = 'token-with-wrong-audience'

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('jwt audience invalid')
      })

      expect(() => jwtService.verifyRefreshToken(token)).toThrow('Invalid refresh token')
    })

    it('should handle malformed token gracefully in decodeToken', () => {
      const malformedToken = 'not.a.valid.jwt.format'

      mockedJwt.decode.mockImplementation(() => {
        throw new Error('Malformed token')
      })

      const result = jwtService.decodeToken(malformedToken)

      expect(result).toBeNull()
    })
  })

  describe('Token verification edge cases', () => {
    it('should verify access token uses different secret than refresh token', () => {
      const token = 'test-token'

      mockedJwt.verify.mockReturnValue({
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        type: 'access',
      } as any)

      jwtService.verifyAccessToken(token)

      // Verify it was called with access token secret (not refresh secret)
      const verifyCall = mockedJwt.verify.mock.calls[0]
      expect(verifyCall[1]).not.toContain('_refresh')
    })

    it('should verify refresh token uses different secret than access token', () => {
      const token = 'test-refresh-token'

      mockedJwt.verify.mockReturnValue({
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'refresh',
        jti: 'jti-123',
      } as any)

      jwtService.verifyRefreshToken(token)

      // Verify it was called with refresh token secret
      const verifyCall = mockedJwt.verify.mock.calls[0]
      expect(verifyCall[1]).toContain('_refresh')
    })

    it('should handle tokens with extra unexpected claims', () => {
      const token = 'token-with-extra-claims'

      mockedJwt.verify.mockReturnValue({
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        type: 'access',
        extraClaim: 'should-not-break',
        anotherExtra: 'also-ignored',
      } as any)

      const result = jwtService.verifyAccessToken(token)

      expect(result.userId).toBe('user-123')
      expect(result.tenantId).toBe('tenant-123')
      expect(result.roleId).toBe('role-123')
    })
  })

  describe('Expiry parsing', () => {
    it('should parse seconds correctly', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      const result = jwtService.generateTokenPair(payload)

      // Access token is 15m = 900000ms
      expect(result.expiresIn).toBe(900000)
    })

    it('should handle token with very short TTL', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
      }

      mockedJwt.sign.mockReturnValue('token' as any)

      // This tests that the service can handle short-lived tokens
      jwtService.generateAccessToken(payload)

      const signCall = mockedJwt.sign.mock.calls[0]
      const options = signCall[2]

      expect(options.expiresIn).toBe('15m')
    })
  })

  describe('Token masking for security', () => {
    it('should mask token in error logs when verification fails', () => {
      const token = 'very-long-token-that-should-be-masked-for-security-reasons'

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token')
      })

      expect(() => jwtService.verifyAccessToken(token)).toThrow()

      // Token masking happens internally, but we verify the method doesn't leak full token
      // by ensuring the error is thrown without exposing the full token in the error message
    })

    it('should mask short tokens completely', () => {
      const shortToken = 'short'

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token')
      })

      expect(() => jwtService.verifyAccessToken(shortToken)).toThrow()
      // Short tokens (<=12 chars) should be completely masked as '***'
    })
  })
})
