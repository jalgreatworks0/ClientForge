/**
 * Unit Tests: PasswordService
 * Tests for password hashing, validation, and strength checking
 */

import { PasswordService } from '../../../backend/core/auth/password-service'

// Mock bcrypt with explicit mock functions (no types to avoid bcrypt's complex type system)
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  getRounds: jest.fn(),
}))

// Import mocked bcrypt - cast to any to bypass type issues
import bcrypt from 'bcrypt'
const mockHash = (bcrypt.hash as any) as jest.Mock
const mockCompare = (bcrypt.compare as any) as jest.Mock
const mockGetRounds = (bcrypt.getRounds as any) as jest.Mock

// Mock security config
jest.mock('../../../config/security/security-config', () => ({
  securityConfig: {
    bcrypt: {
      saltRounds: 12,
    },
  },
  validatePassword: (password: string) => {
    const errors: string[] = []
    if (password.length < 8) errors.push('Password must be at least 8 characters')
    if (password.length > 128) errors.push('Password must not exceed 128 characters')
    if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter')
    if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter')
    if (!/[0-9]/.test(password)) errors.push('Password must contain number')
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Password must contain special character')
    if (/\s/.test(password)) errors.push('Password must not contain spaces')
    return { valid: errors.length === 0, errors }
  },
}))

// Phase 2: ACTIVE - Fixed bcrypt mocking and aligned with real implementation behavior
describe('PasswordService', () => {
  let passwordService: PasswordService

  beforeEach(() => {
    passwordService = new PasswordService()
    jest.clearAllMocks()
  })

  describe('hash', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'SecurePassword123!'
      const hashedPassword = '$2b$12$hashedpassword'

      mockHash.mockResolvedValue(hashedPassword)

      const result = await passwordService.hash(password)

      expect(result).toBe(hashedPassword)
      expect(mockHash).toHaveBeenCalledWith(password, 12)
    })

    it('should throw error if hashing fails', async () => {
      const password = 'Password123!'

      mockHash.mockRejectedValue(new Error('Hashing failed'))

      await expect(passwordService.hash(password)).rejects.toThrow(
        'Failed to hash password'
      )
    })

    it('should throw ValidationError if password does not meet policy requirements', async () => {
      const weakPassword = 'weak' // Too short, no uppercase, no number, no special char

      await expect(passwordService.hash(weakPassword)).rejects.toThrow(
        'Password does not meet requirements'
      )

      // Verify bcrypt.hash was never called
      expect(mockHash).not.toHaveBeenCalled()
    })

    it('should preserve validation error details when password fails policy', async () => {
      const noUppercase = 'password123!' // Missing uppercase

      try {
        await passwordService.hash(noUppercase)
        fail('Should have thrown ValidationError')
      } catch (error: any) {
        expect(error.message).toBe('Password does not meet requirements')
        expect(error.context?.errors).toBeDefined()
        expect(error.context.errors.length).toBeGreaterThan(0)
      }
    })

    it('should throw error when given empty string', async () => {
      const emptyPassword = ''

      await expect(passwordService.hash(emptyPassword)).rejects.toThrow()

      // Verify bcrypt.hash was never called
      expect(mockHash).not.toHaveBeenCalled()
    })

    it('should hash passwords with unicode and emoji characters', async () => {
      const unicodePassword = 'Pāss💥wørd1!'
      const hashedPassword = '$2b$12$unicodehash'

      mockHash.mockResolvedValue(hashedPassword)

      const result = await passwordService.hash(unicodePassword)

      expect(result).toBe(hashedPassword)
      expect(mockHash).toHaveBeenCalledWith(unicodePassword, 12)
    })

    it('should hash very long passwords near the 128 character limit', async () => {
      // Create password exactly 128 chars with all required elements
      const longPassword = 'A1!' + 'a'.repeat(125) // Uppercase, number, special, then lowercase to fill
      const hashedPassword = '$2b$12$longhash'

      mockHash.mockResolvedValue(hashedPassword)

      const result = await passwordService.hash(longPassword)

      expect(result).toBe(hashedPassword)
      expect(mockHash).toHaveBeenCalledWith(longPassword, 12)
    })

    it('should generate unique salts for same password on multiple calls', async () => {
      const password = 'SamePassword123!'
      const hash1 = '$2b$12$salt1hash'
      const hash2 = '$2b$12$salt2hash'

      mockHash
        .mockResolvedValueOnce(hash1)
        .mockResolvedValueOnce(hash2)

      const result1 = await passwordService.hash(password)
      const result2 = await passwordService.hash(password)

      expect(result1).not.toBe(result2)
      expect(mockHash).toHaveBeenCalledTimes(2)
    })
  })

  describe('verify', () => {
    it('should return true for matching password', async () => {
      const password = 'CorrectPassword123!'
      const hash = '$2b$12$validhash'

      mockCompare.mockResolvedValue(true)

      const result = await passwordService.verify(password, hash)

      expect(result).toBe(true)
      expect(mockCompare).toHaveBeenCalledWith(password, hash)
    })

    it('should return false for non-matching password', async () => {
      const password = 'WrongPassword123!'
      const hash = '$2b$12$validhash'

      mockCompare.mockResolvedValue(false)

      const result = await passwordService.verify(password, hash)

      expect(result).toBe(false)
    })

    it('should throw error if verification fails', async () => {
      const password = 'Password123!'
      const hash = 'invalid-hash'

      mockCompare.mockRejectedValue(new Error('Compare failed'))

      await expect(passwordService.verify(password, hash)).rejects.toThrow(
        'Failed to verify password'
      )
    })

    it('should throw error when given empty password', async () => {
      const emptyPassword = ''
      const hash = '$2b$12$validhash'

      mockCompare.mockRejectedValue(new Error('Empty password'))

      await expect(passwordService.verify(emptyPassword, hash)).rejects.toThrow(
        'Failed to verify password'
      )
    })

    it('should throw error when given malformed hash', async () => {
      const password = 'Password123!'
      const malformedHash = 'not-a-valid-bcrypt-hash-format'

      mockCompare.mockRejectedValue(new Error('Invalid hash format'))

      await expect(passwordService.verify(password, malformedHash)).rejects.toThrow(
        'Failed to verify password'
      )
    })

    it('should verify passwords with unicode and emoji characters', async () => {
      const unicodePassword = 'Pāss💥wørd1!'
      const hash = '$2b$12$unicodehash'

      mockCompare.mockResolvedValue(true)

      const result = await passwordService.verify(unicodePassword, hash)

      expect(result).toBe(true)
      expect(mockCompare).toHaveBeenCalledWith(unicodePassword, hash)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should return valid for strong password', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'C0mpl3x!Pass',
        'Str0ng#Password',
        'V@lid8Password',
      ]

      strongPasswords.forEach((password) => {
        const result = passwordService.validatePasswordStrength(password)
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
        expect(result.strength).toBeGreaterThan(0)
      })
    })

    it('should return invalid if password is too short', () => {
      const shortPassword = 'Pass1!'

      const result = passwordService.validatePasswordStrength(shortPassword)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return invalid if password is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!'

      const result = passwordService.validatePasswordStrength(longPassword)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return invalid if password has no uppercase letter', () => {
      const noUppercase = 'password123!'

      const result = passwordService.validatePasswordStrength(noUppercase)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return invalid if password has no lowercase letter', () => {
      const noLowercase = 'PASSWORD123!'

      const result = passwordService.validatePasswordStrength(noLowercase)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return invalid if password has no number', () => {
      const noNumber = 'PasswordOnly!'

      const result = passwordService.validatePasswordStrength(noNumber)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return invalid if password has no special character', () => {
      const noSpecial = 'Password123'

      const result = passwordService.validatePasswordStrength(noSpecial)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return invalid if password contains spaces', () => {
      const withSpaces = 'Pass word 123!'

      const result = passwordService.validatePasswordStrength(withSpaces)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should calculate strength score', () => {
      const password = 'MyV3ry!Str0ng#P@ssw0rd'

      const result = passwordService.validatePasswordStrength(password)

      expect(result.strength).toBeGreaterThan(0)
      expect(result.strength).toBeLessThanOrEqual(100)
    })

    it('should reduce strength for passwords with sequential numbers', () => {
      const sequentialPassword = 'Password123!'

      const result = passwordService.validatePasswordStrength(sequentialPassword)

      // Sequential pattern should reduce strength
      expect(result.valid).toBe(true)
      expect(result.strength).toBeLessThan(100)
    })

    it('should reduce strength for passwords with repeated characters', () => {
      const repeatedPassword = 'Passsword111!'

      const result = passwordService.validatePasswordStrength(repeatedPassword)

      // Repeated pattern (sss, 111) should reduce strength
      expect(result.valid).toBe(true)
      expect(result.strength).toBeLessThan(100)
    })

    it('should reduce strength for passwords with common words', () => {
      const commonWordPassword = 'Password123!'

      const result = passwordService.validatePasswordStrength(commonWordPassword)

      // "password" is a common word, should reduce strength
      expect(result.valid).toBe(true)
      expect(result.strength).toBeLessThan(90) // Reduced due to common word
    })

    it('should handle minimum length password (exactly 8 characters)', () => {
      const minPassword = 'Pass123!'

      const result = passwordService.validatePasswordStrength(minPassword)

      expect(result.valid).toBe(true)
      expect(result.strength).toBeGreaterThan(0)
      expect(minPassword.length).toBe(8)
    })
  })

  describe('generateRandomPassword', () => {
    it('should generate password with default length', () => {
      const password = passwordService.generateRandomPassword()

      expect(password.length).toBe(16)
    })

    it('should generate password with custom length', () => {
      const password = passwordService.generateRandomPassword(24)

      expect(password.length).toBe(24)
    })

    it('should generate password meeting all requirements', () => {
      const password = passwordService.generateRandomPassword()

      const result = passwordService.validatePasswordStrength(password)
      expect(result.valid).toBe(true)
      expect(/[A-Z]/.test(password)).toBe(true)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/[0-9]/.test(password)).toBe(true)
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true)
    })

    it('should generate different passwords on each call', () => {
      const password1 = passwordService.generateRandomPassword()
      const password2 = passwordService.generateRandomPassword()
      const password3 = passwordService.generateRandomPassword()

      expect(password1).not.toBe(password2)
      expect(password2).not.toBe(password3)
      expect(password1).not.toBe(password3)
    })

    it('should generate strong password', () => {
      const password = passwordService.generateRandomPassword()
      const result = passwordService.validatePasswordStrength(password)

      expect(result.valid).toBe(true)
      expect(result.strength).toBeGreaterThan(60)
    })

    it('should generate valid password even with very short length', () => {
      // Minimum is 4 chars (1 upper, 1 lower, 1 number, 1 special)
      // But this won't pass validation (needs 8+ chars)
      const password = passwordService.generateRandomPassword(4)

      expect(password.length).toBe(4)
      expect(/[A-Z]/.test(password)).toBe(true)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/[0-9]/.test(password)).toBe(true)
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true)
    })
  })

  describe('needsRehash', () => {
    it('should return false if hash uses correct rounds', () => {
      const hash = '$2b$12$validhash'

      mockGetRounds.mockReturnValue(12)

      const result = passwordService.needsRehash(hash)

      expect(result).toBe(false)
    })

    it('should return true if hash uses different rounds', () => {
      const hash = '$2b$10$validhash'

      mockGetRounds.mockReturnValue(10)

      const result = passwordService.needsRehash(hash)

      expect(result).toBe(true)
    })

    it('should return false if getRounds throws error', () => {
      const hash = 'invalid-hash'

      mockGetRounds.mockImplementation(() => {
        throw new Error('Invalid hash')
      })

      const result = passwordService.needsRehash(hash)

      expect(result).toBe(false)
    })
  })
})
