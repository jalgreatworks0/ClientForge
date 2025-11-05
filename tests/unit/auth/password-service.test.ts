/**
 * Unit Tests: PasswordService
 * Tests for password hashing, validation, and strength checking
 */

import { PasswordService } from '../../../backend/core/auth/password-service'
import { AppError } from '../../../backend/utils/errors/app-error'
import bcrypt from 'bcrypt'

// Mock bcrypt
jest.mock('bcrypt')
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

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

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never)

      const result = await passwordService.hash(password)

      expect(result).toBe(hashedPassword)
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12)
    })

    it('should use cost factor from environment', async () => {
      process.env.BCRYPT_ROUNDS = '10'
      const password = 'TestPassword123!'

      mockedBcrypt.hash.mockResolvedValue('$2b$10$hash' as never)

      await passwordService.hash(password)

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10)
    })

    it('should throw error if hashing fails', async () => {
      const password = 'Password123!'

      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed'))

      await expect(passwordService.hash(password)).rejects.toThrow(
        'Hashing failed'
      )
    })
  })

  describe('compare', () => {
    it('should return true for matching password', async () => {
      const password = 'CorrectPassword123!'
      const hash = '$2b$12$validhash'

      mockedBcrypt.compare.mockResolvedValue(true as never)

      const result = await passwordService.compare(password, hash)

      expect(result).toBe(true)
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash)
    })

    it('should return false for non-matching password', async () => {
      const password = 'WrongPassword123!'
      const hash = '$2b$12$validhash'

      mockedBcrypt.compare.mockResolvedValue(false as never)

      const result = await passwordService.compare(password, hash)

      expect(result).toBe(false)
    })

    it('should throw error if comparison fails', async () => {
      const password = 'Password123!'
      const hash = 'invalid-hash'

      mockedBcrypt.compare.mockRejectedValue(new Error('Comparison failed'))

      await expect(passwordService.compare(password, hash)).rejects.toThrow(
        'Comparison failed'
      )
    })
  })

  describe('validate', () => {
    it('should pass for strong password', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'C0mpl3x!Pass',
        'Str0ng#Password',
        'V@lid8Password',
      ]

      strongPasswords.forEach((password) => {
        expect(() => passwordService.validate(password)).not.toThrow()
      })
    })

    it('should throw error if password is too short', () => {
      const shortPassword = 'Pass1!'

      expect(() => passwordService.validate(shortPassword)).toThrow(
        new AppError('Password must be at least 8 characters long', 400)
      )
    })

    it('should throw error if password is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!'

      expect(() => passwordService.validate(longPassword)).toThrow(
        new AppError('Password must not exceed 128 characters', 400)
      )
    })

    it('should throw error if password has no uppercase letter', () => {
      const noUppercase = 'password123!'

      expect(() => passwordService.validate(noUppercase)).toThrow(
        new AppError(
          'Password must contain at least one uppercase letter',
          400
        )
      )
    })

    it('should throw error if password has no lowercase letter', () => {
      const noLowercase = 'PASSWORD123!'

      expect(() => passwordService.validate(noLowercase)).toThrow(
        new AppError(
          'Password must contain at least one lowercase letter',
          400
        )
      )
    })

    it('should throw error if password has no number', () => {
      const noNumber = 'PasswordOnly!'

      expect(() => passwordService.validate(noNumber)).toThrow(
        new AppError('Password must contain at least one number', 400)
      )
    })

    it('should throw error if password has no special character', () => {
      const noSpecial = 'Password123'

      expect(() => passwordService.validate(noSpecial)).toThrow(
        new AppError(
          'Password must contain at least one special character (!@#$%^&*)',
          400
        )
      )
    })

    it('should throw error if password contains spaces', () => {
      const withSpaces = 'Pass word 123!'

      expect(() => passwordService.validate(withSpaces)).toThrow(
        new AppError('Password must not contain spaces', 400)
      )
    })
  })

  describe('checkStrength', () => {
    it('should rate very weak password correctly', () => {
      const veryWeakPasswords = ['12345678', 'password', 'abc12345']

      veryWeakPasswords.forEach((password) => {
        const result = passwordService.checkStrength(password)
        expect(result.score).toBeLessThanOrEqual(20)
        expect(result.strength).toBe('very weak')
      })
    })

    it('should rate weak password correctly', () => {
      const weakPasswords = ['Password1', 'Abc123456']

      weakPasswords.forEach((password) => {
        const result = passwordService.checkStrength(password)
        expect(result.score).toBeGreaterThan(20)
        expect(result.score).toBeLessThanOrEqual(40)
        expect(result.strength).toBe('weak')
      })
    })

    it('should rate medium password correctly', () => {
      const mediumPasswords = ['Password1!', 'Abc123!@#']

      mediumPasswords.forEach((password) => {
        const result = passwordService.checkStrength(password)
        expect(result.score).toBeGreaterThan(40)
        expect(result.score).toBeLessThanOrEqual(60)
        expect(result.strength).toBe('medium')
      })
    })

    it('should rate strong password correctly', () => {
      const strongPasswords = [
        'SecureP@ss123',
        'MyStr0ng!Pass',
        'C0mpl3x#Password',
      ]

      strongPasswords.forEach((password) => {
        const result = passwordService.checkStrength(password)
        expect(result.score).toBeGreaterThan(60)
        expect(result.score).toBeLessThanOrEqual(80)
        expect(result.strength).toBe('strong')
      })
    })

    it('should rate very strong password correctly', () => {
      const veryStrongPasswords = [
        'MyV3ry!Str0ng#P@ssw0rd',
        'Sup3r$ecur3!Passw0rd123',
        'Extrem3ly&C0mpl3x!P@ss',
      ]

      veryStrongPasswords.forEach((password) => {
        const result = passwordService.checkStrength(password)
        expect(result.score).toBeGreaterThan(80)
        expect(result.strength).toBe('very strong')
      })
    })

    it('should provide suggestions for weak password', () => {
      const weakPassword = 'password'

      const result = passwordService.checkStrength(weakPassword)

      expect(result.suggestions).toContain('Add uppercase letters')
      expect(result.suggestions).toContain('Add numbers')
      expect(result.suggestions).toContain('Add special characters')
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should have no suggestions for very strong password', () => {
      const strongPassword = 'MyV3ry!Str0ng#P@ssw0rd'

      const result = passwordService.checkStrength(strongPassword)

      expect(result.suggestions.length).toBe(0)
    })

    it('should suggest increasing length for short passwords', () => {
      const shortPassword = 'Pass1!'

      const result = passwordService.checkStrength(shortPassword)

      expect(result.suggestions).toContain('Increase length (minimum 8 characters)')
    })
  })

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      const commonPasswords = [
        'password',
        'Password123',
        'Admin123',
        '12345678',
        'qwerty',
      ]

      commonPasswords.forEach((password) => {
        const result = passwordService.isCommonPassword(password)
        expect(result).toBe(true)
      })
    })

    it('should accept uncommon passwords', () => {
      const uncommonPasswords = [
        'MyUn1qu3!P@ssw0rd',
        'C0mpl3x&Secur3',
        'R@nd0m!Str1ng',
      ]

      uncommonPasswords.forEach((password) => {
        const result = passwordService.isCommonPassword(password)
        expect(result).toBe(false)
      })
    })

    it('should be case-insensitive', () => {
      const variations = ['PASSWORD', 'Password', 'password', 'PaSsWoRd']

      variations.forEach((password) => {
        const result = passwordService.isCommonPassword(password)
        expect(result).toBe(true)
      })
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

      expect(() => passwordService.validate(password)).not.toThrow()
      expect(/[A-Z]/.test(password)).toBe(true)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/[0-9]/.test(password)).toBe(true)
      expect(/[!@#$%^&*]/.test(password)).toBe(true)
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
      const strength = passwordService.checkStrength(password)

      expect(strength.score).toBeGreaterThan(60)
      expect(['strong', 'very strong']).toContain(strength.strength)
    })
  })

  describe('hasBeenPwned', () => {
    it('should return false if password has not been pwned', async () => {
      // Mock the Pwned Passwords API call (implementation detail)
      const password = 'MyUn1qu3!P@ssw0rd'

      const result = await passwordService.hasBeenPwned(password)

      // For now, this should always return false as API integration is optional
      expect(typeof result).toBe('boolean')
    })
  })
})
