import crypto from 'crypto';

import { getPool } from '../../../database/postgresql/pool';
import { logger } from '../../../utils/logging/logger';

export class BackupCodesService {
  private pool = getPool();

  /**
   * Generate backup codes for a user
   */
  async generateBackupCodes(userId: string, count: number = 10): Promise<string[]> {
    try {
      const backupCodes = [];
      
      // Generate secure random codes (hex representation of 4 bytes each)
      for (let i = 0; i < count; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }
      
      // Store in database
      await this.pool.query(
        `INSERT INTO user_mfa_backup_codes (user_id, codes) 
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET codes = EXCLUDED.codes`,
        [userId, backupCodes]
      );
      
      logger.info('[MFA] Backup codes generated for user', { userId, count });
      
      return backupCodes;
    } catch (error) {
      logger.error('[MFA] Error generating backup codes', { error });
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Validate a backup code
   */
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      // Get user's backup codes from database
      const result = await this.pool.query(
        'SELECT codes FROM user_mfa_backup_codes WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const storedCodes = result.rows[0].codes;
      
      // Check if code exists
      const index = storedCodes.indexOf(code.toUpperCase());
      if (index !== -1) {
        // Remove used code from the array
        storedCodes.splice(index, 1);
        
        // Update database with remaining codes
        await this.pool.query(
          'UPDATE user_mfa_backup_codes SET codes = $1 WHERE user_id = $2',
          [storedCodes, userId]
        );
        
        logger.info('[MFA] Backup code validated and consumed', { userId });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('[MFA] Error validating backup code', { error });
      throw new Error('Failed to validate backup code');
    }
  }

  /**
   * Get remaining backup codes count for a user
   */
  async getBackupCodesCount(userId: string): Promise<number> {
    try {
      const result = await this.pool.query(
        'SELECT codes FROM user_mfa_backup_codes WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return 0;
      }
      
      return result.rows[0].codes.length;
    } catch (error) {
      logger.error('[MFA] Error getting backup codes count', { error });
      throw new Error('Failed to get backup codes count');
    }
  }

  /**
   * Regenerate all backup codes for a user
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Generate fresh codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }
      
      // Replace in database
      await this.pool.query(
        'UPDATE user_mfa_backup_codes SET codes = $1 WHERE user_id = $2',
        [backupCodes, userId]
      );
      
      logger.info('[MFA] Backup codes regenerated for user', { userId });
      
      return backupCodes;
    } catch (error) {
      logger.error('[MFA] Error regenerating backup codes', { error });
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Check if a user has any backup codes remaining
   */
  async hasBackupCodes(userId: string): Promise<boolean> {
    try {
      const count = await this.getBackupCodesCount(userId);
      return count > 0;
    } catch (error) {
      logger.error('[MFA] Error checking backup codes', { error });
      throw new Error('Failed to check backup codes');
    }
  }

  /**
   * Store backup codes in database for a user
   */
  async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO user_mfa_backup_codes (user_id, codes) 
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET codes = EXCLUDED.codes`,
        [userId, codes]
      );
      
      logger.info('[MFA] Backup codes stored for user', { userId });
    } catch (error) {
      logger.error('[MFA] Error storing backup codes', { error });
      throw new Error('Failed to store backup codes');
    }
  }

  /**
   * Initialize the database table for backup codes
   */
  async initializeDatabase(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_mfa_backup_codes (
          user_id UUID PRIMARY KEY REFERENCES users(id),
          codes TEXT[] DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      logger.info('[MFA] Backup codes table initialized');
    } catch (error) {
      logger.error('[MFA] Error initializing backup codes table', { error });
      throw new Error('Failed to initialize backup codes database table');
    }
  }

  /**
   * Delete all backup codes for a user
   */
  async deleteBackupCodes(userId: string): Promise<void> {
    try {
      await this.pool.query(
        'DELETE FROM user_mfa_backup_codes WHERE user_id = $1',
        [userId]
      );
      
      logger.info('[MFA] Backup codes deleted for user', { userId });
    } catch (error) {
      logger.error('[MFA] Error deleting backup codes', { error });
      throw new Error('Failed to delete backup codes');
    }
  }

  /**
   * Get all backup codes for a user (for display/backup purposes)
   */
  async getAllBackupCodes(userId: string): Promise<string[]> {
    try {
      const result = await this.pool.query(
        'SELECT codes FROM user_mfa_backup_codes WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return [];
      }
      
      return result.rows[0].codes;
    } catch (error) {
      logger.error('[MFA] Error getting all backup codes', { error });
      throw new Error('Failed to get backup codes');
    }
  }
}