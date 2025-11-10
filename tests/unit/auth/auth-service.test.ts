/**
 * Unit Tests: AuthService
 * Tests for authentication business logic
 */

import { AuthService } from '../../../backend/core/auth/auth-service'
import { UnauthorizedError, ValidationError, ForbiddenError } from '../../../backend/utils/errors/app-error'

// Mock all dependencies at module level
jest.mock('../../../backend/core/users/user-repository')
jest.mock('../../../backend/core/auth/jwt-service')
jest.mock('../../../backend/core/auth/password-service')
jest.mock('../../../backend/core/auth/session-service')
jest.mock('../../../backend/utils/logging/audit-logger')
jest.mock('../../../backend/utils/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))
jest.mock('../../../config/security/security-config', () => ({
  securityConfig: {
    accountLocking: {
      maxFailedAttempts: 5,
      lockDurationMs: 900000, // 15 minutes
    },
    jwt: {
      accessTokenExpiresIn: '15m',
    },
    bcrypt: {
      saltRounds: 12,
    },
  },
}))

// Import mocked modules AFTER mocking
import { userRepository } from '../../../backend/core/users/user-repository'
import { jwtService } from '../../../backend/core/auth/jwt-service'
import { passwordService } from '../../../backend/core/auth/password-service'
import { sessionService } from '../../../backend/core/auth/session-service'
import { auditLogger } from '../../../backend/utils/logging/audit-logger'

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create new service instance
    authService = new AuthService()
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
      isLocked: false,
      lockedUntil: null,
      deletedAt: null,
      failedLoginAttempts: 0,
    }

    const validCredentials = {
      email: 'test@example.com',
      password: 'ValidPassword123!',
      tenantId: 'tenant-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    }

    it('should successfully login with valid credentials', async () => {
      // Setup mocks
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.verify as jest.Mock).mockResolvedValue(true);
      (jwtService.generateTokenPair as jest.Mock).mockReturnValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 900,
      });
      (sessionService.createSession as jest.Mock).mockResolvedValue(undefined);
      (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(undefined);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logSuccessfulLogin as jest.Mock).mockResolvedValue(undefined)

      const result = await authService.login(validCredentials)

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 900,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Admin',
          tenantId: 'tenant-123',
        },
      })

      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        'test@example.com',
        'tenant-123'
      )
      expect(passwordService.verify).toHaveBeenCalledWith(
        'ValidPassword123!',
        '$2b$12$hashedpassword'
      )
      expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith('user-123')
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith('user-123', '192.168.1.1')
      expect(auditLogger.logSuccessfulLogin).toHaveBeenCalled()
    })

    it('should throw UnauthorizedError if user not found', async () => {
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(null);
      (auditLogger.logFailedLogin as jest.Mock).mockResolvedValue(undefined)

      await expect(authService.login(validCredentials)).rejects.toThrow(UnauthorizedError)
      await expect(authService.login(validCredentials)).rejects.toThrow('Invalid credentials')

      expect(auditLogger.logFailedLogin).toHaveBeenCalled()
    })

    it('should throw UnauthorizedError if password is invalid', async () => {
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.verify as jest.Mock).mockResolvedValue(false);
      (userRepository.incrementFailedLoginAttempts as jest.Mock).mockResolvedValue(1);
      (auditLogger.logFailedLogin as jest.Mock).mockResolvedValue(undefined)

      await expect(authService.login(validCredentials)).rejects.toThrow(UnauthorizedError)
      await expect(authService.login(validCredentials)).rejects.toThrow('Invalid credentials')

      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-123')
      expect(auditLogger.logFailedLogin).toHaveBeenCalled()
    })

    it('should lock account after max failed login attempts', async () => {
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.verify as jest.Mock).mockResolvedValue(false);
      (userRepository.incrementFailedLoginAttempts as jest.Mock).mockResolvedValue(5);
      (userRepository.lockAccount as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logFailedLogin as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logAccountLocked as jest.Mock).mockResolvedValue(undefined)

      await expect(authService.login(validCredentials)).rejects.toThrow(UnauthorizedError)

      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-123')
      expect(userRepository.lockAccount).toHaveBeenCalledWith(
        'user-123',
        expect.any(Date)
      )
      expect(auditLogger.logAccountLocked).toHaveBeenCalled()
    })

    it('should throw ForbiddenError if account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        isLocked: true,
        lockedUntil: new Date(Date.now() + 3600000), // Locked for 1 hour
      };

      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(lockedUser);
      (auditLogger.logFailedLogin as jest.Mock).mockResolvedValue(undefined)

      await expect(authService.login(validCredentials)).rejects.toThrow(ForbiddenError)
      await expect(authService.login(validCredentials)).rejects.toThrow('Account is temporarily locked')

      expect(auditLogger.logFailedLogin).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'Account locked',
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      )
    })

    it('should throw ForbiddenError if account is inactive', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
      };

      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(inactiveUser);
      (passwordService.verify as jest.Mock).mockResolvedValue(true);
      (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logFailedLogin as jest.Mock).mockResolvedValue(undefined)

      await expect(authService.login(validCredentials)).rejects.toThrow(ForbiddenError)
      await expect(authService.login(validCredentials)).rejects.toThrow('Account is not active')
    })

    it('should throw ForbiddenError if account is deleted', async () => {
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
      };

      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(deletedUser);
      (passwordService.verify as jest.Mock).mockResolvedValue(true);
      (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logFailedLogin as jest.Mock).mockResolvedValue(undefined)

      await expect(authService.login(validCredentials)).rejects.toThrow(ForbiddenError)
      await expect(authService.login(validCredentials)).rejects.toThrow('Account is not active')
    })

    it('should convert email to lowercase', async () => {
      const credentialsWithUppercase = {
        ...validCredentials,
        email: 'TEST@EXAMPLE.COM',
      };

      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.verify as jest.Mock).mockResolvedValue(true);
      (jwtService.generateTokenPair as jest.Mock).mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });
      (sessionService.createSession as jest.Mock).mockResolvedValue(undefined);
      (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(undefined);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logSuccessfulLogin as jest.Mock).mockResolvedValue(undefined)

      await authService.login(credentialsWithUppercase)

      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        'test@example.com',
        'tenant-123'
      )
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
      phone: '+1234567890',
    }

    const mockCreatedUser = {
      id: 'new-user-123',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      tenantId: 'tenant-123',
      roleId: 'role-user',
      phone: '+1234567890',
      isActive: true,
      isVerified: false,
      passwordHash: '$2b$12$hashedpassword',
    }

    it('should successfully register new user', async () => {
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(null);
      (passwordService.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (passwordService.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
      (userRepository.create as jest.Mock).mockResolvedValue(mockCreatedUser);
      (jwtService.generateTokenPair as jest.Mock).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      })

      const result = await authService.register(validRegistration)

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: mockCreatedUser.id,
          email: mockCreatedUser.email,
          firstName: mockCreatedUser.firstName,
          lastName: mockCreatedUser.lastName,
          role: 'user',
          tenantId: mockCreatedUser.tenantId,
        },
      })

      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        'newuser@example.com',
        'tenant-123'
      )
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith('SecurePassword123!')
      expect(passwordService.hash).toHaveBeenCalledWith('SecurePassword123!')
      expect(userRepository.create).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        roleId: 'role-user',
        email: 'newuser@example.com',
        passwordHash: '$2b$12$hashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
      })
    })

    it('should throw ValidationError if password is weak', async () => {
      (passwordService.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Password must be at least 8 characters', 'Password must contain a number'],
      })

      await expect(authService.register(validRegistration)).rejects.toThrow(ValidationError)
      await expect(authService.register(validRegistration)).rejects.toThrow('Password does not meet requirements')
    })

    it('should throw ValidationError if email already exists', async () => {
      (passwordService.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'newuser@example.com',
      })

      await expect(authService.register(validRegistration)).rejects.toThrow(ValidationError)
      await expect(authService.register(validRegistration)).rejects.toThrow('User with this email already exists')
    })

    it('should convert email to lowercase when checking existence', async () => {
      const registrationWithUppercase = {
        ...validRegistration,
        email: 'NEWUSER@EXAMPLE.COM',
      };

      (passwordService.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(null);
      (passwordService.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
      (userRepository.create as jest.Mock).mockResolvedValue(mockCreatedUser)

      await authService.register(registrationWithUppercase)

      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        'newuser@example.com',
        'tenant-123'
      )
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = 'user-123'
      const refreshToken = 'refresh-token-456';

      (sessionService.deleteSession as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logLogout as jest.Mock).mockResolvedValue(undefined)

      await authService.logout(userId, refreshToken)

      expect(sessionService.deleteSession).toHaveBeenCalledWith(userId, refreshToken)
      expect(auditLogger.logLogout).toHaveBeenCalledWith(userId)
    })

    it('should throw error if session deletion fails', async () => {
      const userId = 'user-123'
      const refreshToken = 'refresh-token-456';

      (sessionService.deleteSession as jest.Mock).mockRejectedValue(new Error('Redis connection failed'))

      await expect(authService.logout(userId, refreshToken)).rejects.toThrow('Redis connection failed')
    })
  })

  describe('refreshAccessToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
      roleId: 'role-123',
      isActive: true,
    }

    it('should generate new access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token'
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        jti: 'jti-789',
      };

      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (sessionService.sessionExists as jest.Mock).mockResolvedValue(true);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.generateAccessToken as jest.Mock).mockReturnValue('new-access-token');
      (jwtService['parseExpiry'] as jest.Mock) = jest.fn().mockReturnValue(900)

      const result = await authService.refreshAccessToken(refreshToken)

      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 900, // 15 minutes in seconds
        userId: 'user-123',
        tenantId: 'tenant-123',
      })

      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken)
      expect(sessionService.sessionExists).toHaveBeenCalledWith('user-123', refreshToken)
      expect(userRepository.findById).toHaveBeenCalledWith('user-123', 'tenant-123')
    })

    it('should throw UnauthorizedError if refresh token is invalid', async () => {
      (jwtService.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('Invalid token')
      })

      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow(UnauthorizedError)
    })

    it('should throw UnauthorizedError if session does not exist', async () => {
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        jti: 'jti-789',
      };

      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (sessionService.sessionExists as jest.Mock).mockResolvedValue(false)

      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow(UnauthorizedError)
      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow('Invalid or expired refresh token')
    })

    it('should throw UnauthorizedError if user not found', async () => {
      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        jti: 'jti-789',
      };

      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (sessionService.sessionExists as jest.Mock).mockResolvedValue(true);
      (userRepository.findById as jest.Mock).mockResolvedValue(null)

      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow(UnauthorizedError)
      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow('User not found or inactive')
    })

    it('should throw UnauthorizedError if user is inactive', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
      }

      const decodedPayload = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        jti: 'jti-789',
      };

      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (sessionService.sessionExists as jest.Mock).mockResolvedValue(true);
      (userRepository.findById as jest.Mock).mockResolvedValue(inactiveUser)

      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow(UnauthorizedError)
      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow('User not found or inactive')
    })
  })
})
