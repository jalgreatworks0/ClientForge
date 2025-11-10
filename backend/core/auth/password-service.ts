/**
 * Password Service
 * Handles password hashing and verification using bcrypt
 */

import bcrypt from 'bcrypt'

import { securityConfig, validatePassword } from '../../../config/security/security-config'
import { ValidationError } from '../../utils/errors/app-error'
import { logger } from '../../utils/logging/logger'

export class PasswordService {
  private readonly saltRounds: number

  constructor() {
    this.saltRounds = securityConfig.bcrypt.saltRounds
  }

  /**
   * Hash a password using bcrypt
   */
  async hash(password: string): Promise<string> {
    try {
      // Validate password meets policy requirements
      const validation = validatePassword(password)
      if (!validation.valid) {
        throw new ValidationError('Password does not meet requirements', {
          errors: validation.errors,
        })
      }

      const hash = await bcrypt.hash(password, this.saltRounds)

      logger.debug('Password hashed successfully', {
        saltRounds: this.saltRounds,
      })

      return hash
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }

      logger.error('Failed to hash password', { error })
      throw new Error('Failed to hash password')
    }
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash)

      logger.debug('Password verification', { isValid })

      return isValid
    } catch (error) {
      logger.error('Failed to verify password', { error })
      throw new Error('Failed to verify password')
    }
  }

  /**
   * Check if password needs rehashing (if salt rounds changed)
   */
  needsRehash(hash: string): boolean {
    try {
      const rounds = bcrypt.getRounds(hash)
      return rounds !== this.saltRounds
    } catch (error) {
      logger.error('Failed to check if password needs rehash', { error })
      return false
    }
  }

  /**
   * Generate a random password (for password reset emails)
   */
  generateRandomPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    const allChars = uppercase + lowercase + numbers + special

    let password = ''

    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('')
  }

  /**
   * Validate password strength without hashing
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[]; strength: number } {
    const validation = validatePassword(password)

    // Calculate password strength (0-100)
    let strength = 0

    if (password.length >= 8) strength += 20
    if (password.length >= 12) strength += 10
    if (password.length >= 16) strength += 10

    if (/[A-Z]/.test(password)) strength += 15
    if (/[a-z]/.test(password)) strength += 15
    if (/[0-9]/.test(password)) strength += 15
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15

    // Check for common patterns (reduce strength)
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123|234|345|456|567|678|789/, // Sequential numbers
      /abc|bcd|cde|def|efg|fgh|ghi/, // Sequential letters
      /password|qwerty|admin|letmein/, // Common words
    ]

    for (const pattern of commonPatterns) {
      if (pattern.test(password.toLowerCase())) {
        strength -= 10
      }
    }

    strength = Math.max(0, Math.min(100, strength))

    return {
      valid: validation.valid,
      errors: validation.errors,
      strength,
    }
  }
}

// Export singleton instance
export const passwordService = new PasswordService()

// Export convenience function for scripts
export const hashPassword = (password: string): Promise<string> => {
  return passwordService.hash(password)
}
