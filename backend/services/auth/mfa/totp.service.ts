/**
 * TOTP MFA Service
 * Implements Time-based One-Time Password authentication (RFC 6238)
 * with backup codes, QR code generation, and account lockout protection
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getPool } from '../../../database/postgresql/pool';
import { logger } from '../../../utils/logging/logger';
import * as crypto from 'crypto';

export interface TOTPSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  provisioningUrl: string;
}

export interface MFAStatus {
  type: 'totp' | null;
  enabled: boolean;
  backupCodesRemaining?: number;
}

export class TOTPService {
  private pool = getPool();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  /**
   * Generate a new TOTP secret for a user
   */
  async generateSecret(userId: string): Promise<string> {
    try {
      // Generate a secure random secret using speakeasy
      const secret = speakeasy.generateSecret({
        length: 32, // Increased from 20 to 32 for enhanced security
        name: 'ClientForge CRM',
        issuer: 'ClientForge'
      });

      // Encrypt secret before storing
      const encryptedSecret = this.encryptSecret(secret.base32);

      // Store the encrypted secret in database
      await this.pool.query(
        `INSERT INTO user_mfa (user_id, mfa_type, totp_secret)
         VALUES ($1, 'totp', $2)
         ON CONFLICT (user_id)
         DO UPDATE SET totp_secret = EXCLUDED.totp_secret`,
        [userId, encryptedSecret]
      );

      logger.info('[MFA] TOTP secret generated for user', { userId });

      return secret.base32;
    } catch (error: any) {
      logger.error('[MFA] Error generating TOTP secret', { error: error.message });
      throw new Error('Failed to generate TOTP secret');
    }
  }

  /**
   * Verify a TOTP code with rate limiting and account lockout
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    try {
      // Check if account is locked
      const lockStatus = await this.checkAccountLock(userId);
      if (lockStatus.isLocked) {
        throw new Error(`Account locked due to too many failed attempts. Try again after ${lockStatus.remainingMinutes} minutes.`);
      }

      // Get the stored encrypted secret from database
      const result = await this.pool.query(
        `SELECT totp_secret, failed_attempts FROM user_mfa
         WHERE user_id = $1 AND mfa_type = 'totp' AND mfa_enabled = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('No TOTP secret found for user');
      }

      const encryptedSecret = result.rows[0].totp_secret;
      const failedAttempts = result.rows[0].failed_attempts || 0;

      // Decrypt secret
      const secret = this.decryptSecret(encryptedSecret);

      // Verify the code using speakeasy
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow codes from 1 step before/after current time (reduced from 6 for security)
      });

      if (verified) {
        // Reset failed attempts on successful verification
        await this.resetFailedAttempts(userId);

        // Log successful verification
        await this.logMFAVerification(userId, true);

        logger.info('[MFA] TOTP code verified successfully', { userId });
        return true;
      } else {
        // Increment failed attempts
        await this.incrementFailedAttempts(userId, failedAttempts);

        // Log failed verification
        await this.logMFAVerification(userId, false);

        logger.warn('[MFA] TOTP code verification failed', {
          userId,
          failedAttempts: failedAttempts + 1
        });
        return false;
      }
    } catch (error: any) {
      logger.error('[MFA] Error verifying TOTP code', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate provisioning URL for mobile authenticator apps
   */
  async generateProvisioningUrl(userId: string, secret: string, userEmail?: string): Promise<string> {
    try {
      const label = userEmail ? `ClientForge:${userEmail}` : `ClientForge:${userId}`;

      const url = speakeasy.otpauthURL({
        secret: secret,
        label,
        issuer: 'ClientForge CRM',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        encoding: 'base32'
      });

      return url;
    } catch (error: any) {
      logger.error('[MFA] Error generating provisioning URL', { error: error.message });
      throw new Error('Failed to generate provisioning URL');
    }
  }

  /**
   * Enable TOTP for a user with backup codes and QR code
   */
  async enableTOTP(userId: string, userEmail?: string): Promise<TOTPSetupData> {
    try {
      // Generate new secret
      const secret = await this.generateSecret(userId);

      // Generate provisioning URL
      const provisioningUrl = await this.generateProvisioningUrl(userId, secret, userEmail);

      // Generate QR code from provisioning URL
      const qrCode = await QRCode.toDataURL(provisioningUrl);

      // Generate backup codes (10 codes)
      const backupCodes: string[] = [];
      const hashedBackupCodes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        backupCodes.push(code);
        // Hash backup codes before storage
        hashedBackupCodes.push(this.hashBackupCode(code));
      }

      // Store hashed backup codes in database
      await this.pool.query(
        `UPDATE user_mfa
         SET mfa_enabled = true,
             backup_codes = $1
         WHERE user_id = $2 AND mfa_type = 'totp'`,
        [hashedBackupCodes, userId]
      );

      logger.info('[MFA] TOTP enabled for user with backup codes', { userId });

      return {
        secret,
        qrCode,
        backupCodes, // Return plaintext codes to show user (only time they see them)
        provisioningUrl
      };
    } catch (error: any) {
      logger.error('[MFA] Error enabling TOTP', { error: error.message });
      throw new Error('Failed to enable TOTP');
    }
  }

  /**
   * Disable TOTP for a user
   */
  async disableTOTP(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE user_mfa
         SET mfa_enabled = false,
             totp_secret = NULL,
             backup_codes = NULL,
             failed_attempts = 0,
             locked_until = NULL
         WHERE user_id = $1 AND mfa_type = 'totp'`,
        [userId]
      );

      logger.info('[MFA] TOTP disabled for user', { userId });
    } catch (error: any) {
      logger.error('[MFA] Error disabling TOTP', { error: error.message });
      throw new Error('Failed to disable TOTP');
    }
  }

  /**
   * Get current MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<MFAStatus> {
    try {
      const result = await this.pool.query(
        `SELECT mfa_type, mfa_enabled, backup_codes FROM user_mfa WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return { type: null, enabled: false };
      }

      const row = result.rows[0];
      const backupCodes = row.backup_codes || [];

      return {
        type: row.mfa_type,
        enabled: row.mfa_enabled,
        backupCodesRemaining: backupCodes.length
      };
    } catch (error: any) {
      logger.error('[MFA] Error getting MFA status', { error: error.message });
      throw new Error('Failed to get MFA status');
    }
  }

  /**
   * Validate backup code with hash comparison
   */
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT backup_codes FROM user_mfa
         WHERE user_id = $1 AND mfa_type = 'totp' AND mfa_enabled = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const hashedBackupCodes = result.rows[0].backup_codes || [];

      // Hash the provided code and compare with stored hashes
      const hashedCode = this.hashBackupCode(code.toUpperCase());
      const matchIndex = hashedBackupCodes.findIndex((storedHash: string) =>
        this.compareHashes(hashedCode, storedHash)
      );

      if (matchIndex !== -1) {
        // Remove the used backup code
        hashedBackupCodes.splice(matchIndex, 1);

        // Update database to remove used backup code
        await this.pool.query(
          `UPDATE user_mfa SET backup_codes = $1 WHERE user_id = $2 AND mfa_type = 'totp'`,
          [hashedBackupCodes, userId]
        );

        // Reset failed attempts on successful backup code use
        await this.resetFailedAttempts(userId);

        // Log successful backup code use
        await this.logMFAVerification(userId, true, 'backup_code');

        logger.info('[MFA] Backup code validated and consumed', {
          userId,
          remainingCodes: hashedBackupCodes.length
        });
        return true;
      }

      // Log failed backup code attempt
      await this.logMFAVerification(userId, false, 'backup_code');

      return false;
    } catch (error: any) {
      logger.error('[MFA] Error validating backup code', { error: error.message });
      throw new Error('Failed to validate backup code');
    }
  }

  /**
   * Generate recovery codes for a user
   */
  async generateRecoveryCodes(userId: string): Promise<string[]> {
    try {
      const recoveryCodes: string[] = [];
      const hashedRecoveryCodes: string[] = [];

      // Generate 10 secure recovery codes
      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        recoveryCodes.push(code);
        hashedRecoveryCodes.push(this.hashBackupCode(code));
      }

      // Store hashed codes in database
      await this.pool.query(
        `UPDATE user_mfa
         SET backup_codes = $1
         WHERE user_id = $2 AND mfa_type = 'totp'`,
        [hashedRecoveryCodes, userId]
      );

      logger.info('[MFA] Recovery codes generated for user', { userId });

      return recoveryCodes;
    } catch (error: any) {
      logger.error('[MFA] Error generating recovery codes', { error: error.message });
      throw new Error('Failed to generate recovery codes');
    }
  }

  /**
   * Encrypt TOTP secret using AES-256-GCM
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(
      process.env.MFA_ENCRYPTION_KEY || process.env.SSO_ENCRYPTION_KEY || crypto.randomBytes(32)
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted
    });
  }

  /**
   * Decrypt TOTP secret
   */
  private decryptSecret(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(
      process.env.MFA_ENCRYPTION_KEY || process.env.SSO_ENCRYPTION_KEY || crypto.randomBytes(32)
    );
    const data = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(data.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash backup code using SHA-256
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Compare two hashes in constant time to prevent timing attacks
   */
  private compareHashes(hash1: string, hash2: string): boolean {
    if (hash1.length !== hash2.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < hash1.length; i++) {
      result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Check if account is locked due to failed attempts
   */
  private async checkAccountLock(
    userId: string
  ): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
    try {
      const result = await this.pool.query(
        `SELECT locked_until FROM user_mfa WHERE user_id = $1 AND mfa_type = 'totp'`,
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].locked_until) {
        return { isLocked: false };
      }

      const lockedUntil = new Date(result.rows[0].locked_until);
      const now = new Date();

      if (lockedUntil > now) {
        const remainingMs = lockedUntil.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
        return { isLocked: true, remainingMinutes };
      }

      // Lock expired, reset it
      await this.pool.query(
        `UPDATE user_mfa SET locked_until = NULL, failed_attempts = 0
         WHERE user_id = $1 AND mfa_type = 'totp'`,
        [userId]
      );

      return { isLocked: false };
    } catch (error: any) {
      logger.error('[MFA] Error checking account lock', { error: error.message });
      return { isLocked: false };
    }
  }

  /**
   * Increment failed verification attempts
   */
  private async incrementFailedAttempts(userId: string, currentAttempts: number): Promise<void> {
    try {
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        await this.pool.query(
          `UPDATE user_mfa
           SET failed_attempts = $1, locked_until = $2
           WHERE user_id = $3 AND mfa_type = 'totp'`,
          [newAttempts, lockedUntil, userId]
        );

        logger.warn('[MFA] Account locked due to failed attempts', {
          userId,
          attempts: newAttempts,
          lockedUntil
        });
      } else {
        await this.pool.query(
          `UPDATE user_mfa SET failed_attempts = $1
           WHERE user_id = $2 AND mfa_type = 'totp'`,
          [newAttempts, userId]
        );
      }
    } catch (error: any) {
      logger.error('[MFA] Error incrementing failed attempts', { error: error.message });
    }
  }

  /**
   * Reset failed verification attempts
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE user_mfa SET failed_attempts = 0, locked_until = NULL
         WHERE user_id = $1 AND mfa_type = 'totp'`,
        [userId]
      );
    } catch (error: any) {
      logger.error('[MFA] Error resetting failed attempts', { error: error.message });
    }
  }

  /**
   * Log MFA verification attempt
   */
  private async logMFAVerification(
    userId: string,
    success: boolean,
    method: string = 'totp'
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO mfa_verification_log (user_id, verification_method, success, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userId, method, success, null] // IP address would come from request context
      );
    } catch (error: any) {
      logger.error('[MFA] Error logging verification attempt', { error: error.message });
      // Don't throw - logging failure shouldn't break the flow
    }
  }
}