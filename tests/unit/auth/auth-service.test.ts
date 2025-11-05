/**
 * Unit Tests: AuthService
 * Tests for authentication business logic
 */

import { AuthService } from '../../../backend/core/auth/auth-service'
import { UserRepository } from '../../../backend/core/users/user-repository'
import { JwtService } from '../../../backend/core/auth/jwt-service'
import { SessionService } from '../../../backend/core/auth/session-service'
import { AuditLogger } from '../../../backend/utils/logging/audit-logger'
import { AppError } from '../../../backend/utils/errors/app-error'
import bcrypt from 'bcrypt'

// Mock bcrypt
jest.mock('bcrypt')
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('AuthService', () => {
  let authService: AuthService
  let userRepository: jest.Mocked<UserRepository>
  let jwtService: jest.Mocked<JwtService>
  let sessionService: jest.Mocked<SessionService>
  let auditLogger: jest.Mocked<AuditLogger>

  beforeEach(() => {
    // Create mocked dependencies
    userRepository = {
      findByEmailAndTenant: jest.fn(),
      resetFailedLoginAttempts: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedLoginAttempts: jest.fn(),
      lockAccount: jest.fn(),
      findById: jest.fn(),
    } as any

    jwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as any

    sessionService = {
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      sessionExists: jest.fn(),
      deleteAllUserSessions: jest.fn(),
    } as any

    auditLogger = {
      logSuccessfulLogin: jest.fn(),
      logFailedLogin: jest.fn(),
      logAccountLocked: jest.fn(),
      logLogout: jest.fn(),
    } as any

    authService = new AuthService(
      userRepository,
      jwtService,
      sessionService,
      auditLogger
    )
  })

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: '$2b$12$hashedpassword',
      tenantId: 'tenant-123',
      roleId: 'role-123',
      isActive: true,
      isVerified: true,
      firstName: 'John',
      lastName: 'Doe',
      role: { name: 'Admin' },
      lockedUntil: null,
      deletedAt: null,
      failedLoginAttempts: 0,
    }

    const validCredentials = {
      email: 'test@example.com',
      password: 'ValidPassword123!',
      tenantId: 'tenant-123',
      ipAddress: '192.168.1.1',
    }

    it('should successfully login with valid credentials', async () => {
      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)
      jwtService.generateAccessToken.mockReturnValue('access-token-123')
      jwtService.generateRefreshToken.mockReturnValue('refresh-token-456')
      sessionService.createSession.mockResolvedValue(undefined)

      const result = await authService.login(validCredentials)

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Admin',
        },
      })

      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        'test@example.com',
        'tenant-123'
      )
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'ValidPassword123!',
        '$2b$12$hashedpassword'
      )
      expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith('user-123')
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith('user-123')
      expect(auditLogger.logSuccessfulLogin).toHaveBeenCalled()
    })

    it('should throw error if user not found', async () => {
      userRepository.findByEmailAndTenant.mockResolvedValue(null)

      await expect(authService.login(validCredentials)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      )

      expect(auditLogger.logFailedLogin).toHaveBeenCalledWith(
        'test@example.com',
        'tenant-123',
        'User not found',
        '192.168.1.1'
      )
    })

    it('should throw error if password is invalid', async () => {
      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(authService.login(validCredentials)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      )

      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-123')
      expect(auditLogger.logFailedLogin).toHaveBeenCalled()
    })

    it('should lock account after 5 failed login attempts', async () => {
      const userWithFailedAttempts = {
        ...mockUser,
        failedLoginAttempts: 4, // 5th attempt will lock
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(userWithFailedAttempts)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(authService.login(validCredentials)).rejects.toThrow()

      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalled()
      expect(userRepository.lockAccount).toHaveBeenCalledWith(
        'user-123',
        expect.any(Date)
      )
      expect(auditLogger.logAccountLocked).toHaveBeenCalled()
    })

    it('should throw error if account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000), // Locked for 1 hour
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(lockedUser)

      await expect(authService.login(validCredentials)).rejects.toThrow(
        new AppError('Account is temporarily locked. Please try again later.', 403)
      )

      expect(auditLogger.logFailedLogin).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'Account locked',
        expect.any(String)
      )
    })

    it('should throw error if account is inactive', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(inactiveUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      await expect(authService.login(validCredentials)).rejects.toThrow(
        new AppError('Account is not active', 403)
      )
    })

    it('should throw error if account is deleted', async () => {
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(deletedUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      await expect(authService.login(validCredentials)).rejects.toThrow(
        new AppError('Account is not active', 403)
      )
    })

    it('should throw error if account is not verified', async () => {
      const unverifiedUser = {
        ...mockUser,
        isVerified: false,
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(unverifiedUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      await expect(authService.login(validCredentials)).rejects.toThrow(
        new AppError('Please verify your email before logging in', 403)
      )
    })
  })

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        sessionId: 'session-123',
      }

      jwtService.verifyRefreshToken.mockReturnValue(decodedPayload)
      sessionService.sessionExists.mockResolvedValue(true)
      jwtService.generateAccessToken.mockReturnValue('new-access-token')

      const result = await authService.refreshToken(refreshToken)

      expect(result).toEqual({
        accessToken: 'new-access-token',
      })

      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken)
      expect(sessionService.sessionExists).toHaveBeenCalledWith('session-123')
    })

    it('should throw error if refresh token is invalid', async () => {
      jwtService.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        new AppError('Invalid refresh token', 401)
      )
    })

    it('should throw error if session does not exist', async () => {
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        sessionId: 'session-123',
      }

      jwtService.verifyRefreshToken.mockReturnValue(decodedPayload)
      sessionService.sessionExists.mockResolvedValue(false)

      await expect(authService.refreshToken('valid-token')).rejects.toThrow(
        new AppError('Session has been invalidated', 401)
      )
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = 'user-123'
      const sessionId = 'session-123'
      const tenantId = 'tenant-123'

      sessionService.deleteSession.mockResolvedValue(undefined)
      auditLogger.logLogout.mockResolvedValue(undefined)

      await authService.logout(userId, sessionId, tenantId)

      expect(sessionService.deleteSession).toHaveBeenCalledWith(sessionId)
      expect(auditLogger.logLogout).toHaveBeenCalledWith(
        userId,
        tenantId,
        undefined
      )
    })

    it('should handle logout even if session deletion fails', async () => {
      const userId = 'user-123'
      const sessionId = 'session-123'
      const tenantId = 'tenant-123'

      sessionService.deleteSession.mockRejectedValue(new Error('Redis connection failed'))

      await expect(authService.logout(userId, sessionId, tenantId)).resolves.not.toThrow()
    })
  })

  describe('register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      tenantId: 'tenant-123',
      roleId: 'role-user',
    }

    it('should successfully register new user', async () => {
      userRepository.findByEmailAndTenant.mockResolvedValue(null) // No existing user
      mockedBcrypt.hash.mockResolvedValue('$2b$12$hashedpassword' as never)

      const mockCreatedUser = {
        id: 'new-user-123',
        email: validRegistration.email,
        firstName: validRegistration.firstName,
        lastName: validRegistration.lastName,
        tenantId: validRegistration.tenantId,
        roleId: validRegistration.roleId,
        isActive: true,
        isVerified: false,
      }

      userRepository.create = jest.fn().mockResolvedValue(mockCreatedUser)

      const result = await authService.register(validRegistration)

      expect(result).toEqual({
        id: 'new-user-123',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      })

      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        'newuser@example.com',
        'tenant-123'
      )
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 12)
    })

    it('should throw error if email already exists', async () => {
      userRepository.findByEmailAndTenant.mockResolvedValue({
        id: 'existing-user',
        email: validRegistration.email,
      } as any)

      await expect(authService.register(validRegistration)).rejects.toThrow(
        new AppError('Email already registered', 409)
      )
    })
  })
})
