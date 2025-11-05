/**
 * Authentication Service
 * Core business logic for user authentication
 */

import { userRepository, User } from '../users/user-repository'
import { jwtService, TokenPair } from './jwt-service'
import { passwordService } from './password-service'
import { sessionService } from './session-service'
import { auditLogger } from '../../utils/logging/audit-logger'
import { UnauthorizedError, ValidationError, ForbiddenError } from '../../utils/errors/app-error'
import { logger } from '../../utils/logging/logger'
import { securityConfig } from '../../../config/security/security-config'

export interface LoginCredentials {
  email: string
  password: string
  tenantId: string
  ipAddress?: string
  userAgent?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    tenantId: string
  }
}

export interface RegisterData {
  tenantId: string
  roleId: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { email, password, tenantId, ipAddress, userAgent } = credentials

    try {
      // 1. Find user by email and tenant
      const user = await userRepository.findByEmailAndTenant(email.toLowerCase(), tenantId)

      if (!user) {
        await auditLogger.logFailedLogin(email, tenantId, 'User not found', undefined, ipAddress, userAgent)
        throw new UnauthorizedError('Invalid credentials')
      }

      // 2. Check if account is locked
      if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
        await auditLogger.logFailedLogin(email, tenantId, 'Account locked', user.failedLoginAttempts, ipAddress, userAgent)
        throw new ForbiddenError('Account is temporarily locked. Please try again later.')
      }

      // 3. Verify password
      const isPasswordValid = await passwordService.verify(password, user.passwordHash)

      if (!isPasswordValid) {
        await this.handleFailedLogin(user.id, email, tenantId, ipAddress, userAgent)
        throw new UnauthorizedError('Invalid credentials')
      }

      // 4. Check if user is active
      if (!user.isActive || user.deletedAt) {
        await auditLogger.logFailedLogin(email, tenantId, 'Account inactive', undefined, ipAddress, userAgent)
        throw new ForbiddenError('Account is not active')
      }

      // 5. Reset failed login attempts
      await userRepository.resetFailedLoginAttempts(user.id)

      // 6. Generate tokens
      const tokenPair = jwtService.generateTokenPair({
        userId: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        email: user.email,
      })

      // 7. Create session in Redis + PostgreSQL
      await sessionService.createSession(user.id, tokenPair.refreshToken, {
        userAgent,
        ipAddress,
        deviceType: this.detectDeviceType(userAgent),
      })

      // 8. Update last login timestamp
      await userRepository.updateLastLogin(user.id, ipAddress)

      // 9. Audit log successful login
      await auditLogger.logSuccessfulLogin(user.id, email, tenantId, ipAddress, userAgent)

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        tenantId,
        ipAddress,
      })

      // 10. Return response (never include password hash!)
      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role?.name || 'user',
          tenantId: user.tenantId,
        },
      }
    } catch (error) {
      // Re-throw known errors
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        throw error
      }

      // Log unexpected errors
      logger.error('Login failed with unexpected error', {
        error,
        email,
        tenantId,
      })
      throw new UnauthorizedError('Login failed')
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      // 1. Validate password strength
      const passwordValidation = passwordService.validatePasswordStrength(data.password)
      if (!passwordValidation.valid) {
        throw new ValidationError('Password does not meet requirements', {
          errors: passwordValidation.errors,
        })
      }

      // 2. Check if user already exists
      const existingUser = await userRepository.findByEmailAndTenant(
        data.email.toLowerCase(),
        data.tenantId
      )

      if (existingUser) {
        throw new ValidationError('User with this email already exists')
      }

      // 3. Hash password
      const passwordHash = await passwordService.hash(data.password)

      // 4. Create user
      const user = await userRepository.create({
        tenantId: data.tenantId,
        roleId: data.roleId,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      })

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        tenantId: data.tenantId,
      })

      // TODO: Send email verification email

      return user
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }

      logger.error('Registration failed', { error, email: data.email })
      throw error
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Delete session from Redis + PostgreSQL
      await sessionService.deleteSession(userId, refreshToken)

      // Audit log
      await auditLogger.logLogout(userId)

      logger.info('User logged out', { userId })
    } catch (error) {
      logger.error('Logout failed', { error, userId })
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // 1. Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken)

      // 2. Check if session exists
      const sessionExists = await sessionService.sessionExists(payload.userId, refreshToken)

      if (!sessionExists) {
        throw new UnauthorizedError('Invalid or expired refresh token')
      }

      // 3. Get user to fetch current roleId
      const user = await userRepository.findById(payload.userId, payload.tenantId)

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive')
      }

      // 4. Generate new access token
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        email: user.email,
        jti: payload.jti,
      })

      const expiresIn = jwtService['parseExpiry'](securityConfig.jwt.accessTokenExpiresIn)

      logger.debug('Access token refreshed', { userId: user.id })

      return {
        accessToken,
        expiresIn,
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error
      }

      logger.error('Failed to refresh access token', { error })
      throw new UnauthorizedError('Failed to refresh token')
    }
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(
    userId: string,
    email: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Increment failed attempts
      const failedAttempts = await userRepository.incrementFailedLoginAttempts(userId)

      // Lock account after max attempts
      const maxAttempts = securityConfig.accountLocking.maxFailedAttempts
      if (failedAttempts >= maxAttempts) {
        const lockDuration = securityConfig.accountLocking.lockDurationMs
        const lockUntil = new Date(Date.now() + lockDuration)

        await userRepository.lockAccount(userId, lockUntil)
        await auditLogger.logAccountLocked(userId, email, tenantId, failedAttempts, ipAddress)

        logger.warn('Account locked due to failed login attempts', {
          userId,
          email,
          failedAttempts,
          lockUntil,
        })
      } else {
        await auditLogger.logFailedLogin(email, tenantId, 'Invalid password', failedAttempts, ipAddress, userAgent)
      }
    } catch (error) {
      logger.error('Failed to handle failed login', { error, userId })
    }
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) {
      return 'unknown'
    }

    const ua = userAgent.toLowerCase()

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile'
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet'
    }

    return 'desktop'
  }
}

// Export singleton instance
export const authService = new AuthService()
