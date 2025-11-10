/**
 * JWT Service
 * Handles JWT token generation and verification
 */

import jwt, { Algorithm } from 'jsonwebtoken'

import { securityConfig } from '../../../config/security/security-config'
import { UnauthorizedError } from '../../utils/errors/app-error'
import { logger } from '../../utils/logging/logger'

export interface JWTPayload {
  userId: string
  tenantId: string
  roleId: string
  email?: string
  jti?: string // JWT ID for tracking
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class JWTService {
  private readonly accessTokenSecret: string
  private readonly refreshTokenSecret: string
  private readonly accessTokenExpiresIn: string
  private readonly refreshTokenExpiresIn: string

  constructor() {
    this.accessTokenSecret = securityConfig.jwt.secret
    this.refreshTokenSecret = securityConfig.jwt.secret + '_refresh' // Different secret for refresh tokens
    this.accessTokenExpiresIn = securityConfig.jwt.accessTokenExpiresIn
    this.refreshTokenExpiresIn = securityConfig.jwt.refreshTokenExpiresIn
  }

  /**
   * Generate access token (short-lived, 15 minutes)
   */
  generateAccessToken(payload: JWTPayload): string {
    try {
      const algorithm: Algorithm = securityConfig.jwt.algorithm as Algorithm
      // @ts-expect-error - jwt.sign overload resolution issue with Algorithm type
      const token = jwt.sign(
        {
          userId: payload.userId,
          tenantId: payload.tenantId,
          roleId: payload.roleId,
          email: payload.email,
          type: 'access',
          jti: payload.jti || this.generateJTI(),
        },
        this.accessTokenSecret,
        {
          expiresIn: this.accessTokenExpiresIn,
          algorithm,
          issuer: 'clientforge-crm',
          audience: 'clientforge-users',
        }
      )

      logger.debug('Access token generated', {
        userId: payload.userId,
        tenantId: payload.tenantId,
        expiresIn: this.accessTokenExpiresIn,
      })

      return token
    } catch (error) {
      logger.error('Failed to generate access token', { error, userId: payload.userId })
      throw new Error('Failed to generate access token')
    }
  }

  /**
   * Generate refresh token (long-lived, 7 days)
   */
  generateRefreshToken(payload: Omit<JWTPayload, 'roleId'>): string {
    try {
      const algorithm: Algorithm = securityConfig.jwt.algorithm as Algorithm
      // @ts-expect-error - jwt.sign overload resolution issue with Algorithm type
      const token = jwt.sign(
        {
          userId: payload.userId,
          tenantId: payload.tenantId,
          type: 'refresh',
          jti: payload.jti || this.generateJTI(),
        },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiresIn,
          algorithm,
          issuer: 'clientforge-crm',
          audience: 'clientforge-users',
        }
      )

      logger.debug('Refresh token generated', {
        userId: payload.userId,
        tenantId: payload.tenantId,
        expiresIn: this.refreshTokenExpiresIn,
      })

      return token
    } catch (error) {
      logger.error('Failed to generate refresh token', { error, userId: payload.userId })
      throw new Error('Failed to generate refresh token')
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JWTPayload): TokenPair {
    const jti = this.generateJTI()

    const accessToken = this.generateAccessToken({ ...payload, jti })
    const refreshToken = this.generateRefreshToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      jti,
    })

    // Parse expiry time (e.g., "15m" -> milliseconds)
    const expiresIn = this.parseExpiry(this.accessTokenExpiresIn)

    return {
      accessToken,
      refreshToken,
      expiresIn,
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: [securityConfig.jwt.algorithm as Algorithm],
        issuer: 'clientforge-crm',
        audience: 'clientforge-users',
      }) as any

      if (decoded.type !== 'access') {
        throw new UnauthorizedError('Invalid token type')
      }

      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        roleId: decoded.roleId,
        email: decoded.email,
        jti: decoded.jti,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired', { token: this.maskToken(token) })
        throw new UnauthorizedError('Token expired')
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token', {
          token: this.maskToken(token),
          error: error.message,
        })
        throw new UnauthorizedError('Invalid token')
      }

      logger.error('Failed to verify access token', { error })
      throw new UnauthorizedError('Token verification failed')
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): Omit<JWTPayload, 'roleId'> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: [securityConfig.jwt.algorithm as Algorithm],
        issuer: 'clientforge-crm',
        audience: 'clientforge-users',
      }) as any

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type')
      }

      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        jti: decoded.jti,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired', { token: this.maskToken(token) })
        throw new UnauthorizedError('Refresh token expired')
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token', {
          token: this.maskToken(token),
          error: error.message,
        })
        throw new UnauthorizedError('Invalid refresh token')
      }

      logger.error('Failed to verify refresh token', { error })
      throw new UnauthorizedError('Token verification failed')
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token)
    } catch (error) {
      logger.error('Failed to decode token', { error })
      return null
    }
  }

  /**
   * Generate unique JWT ID (jti)
   */
  private generateJTI(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/)
    if (!match) {
      return 900000 // Default 15 minutes
    }

    const value = parseInt(match[1], 10)
    const unit = match[2]

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }

    return value * (multipliers[unit] || 1000)
  }

  /**
   * Mask token for logging (show first/last 6 chars only)
   */
  private maskToken(token: string): string {
    if (token.length <= 12) {
      return '***'
    }
    return `${token.substring(0, 6)}...${token.substring(token.length - 6)}`
  }
}

// Export singleton instance
export const jwtService = new JWTService()
