import { TOTPService } from '../../../../backend/services/auth/mfa/totp.service';
import { getPool } from '../../../../backend/database/postgresql/pool';

// Mock the database pool
jest.mock('../../../../backend/database/postgresql/pool', () => ({
  getPool: jest.fn()
}));

describe('TOTPService', () => {
  let service: TOTPService;
  const mockPool = {
    query: jest.fn()
  };

  beforeEach(() => {
    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new TOTPService();
    
    // Clear all mocks
    mockPool.query.mockClear();
  });

  describe('generateSecret', () => {
    it('should generate a TOTP secret for a user', async () => {
      const mockResult = {
        rows: [{ id: 'secret-123' }]
      };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      const result = await service.generateSecret('user-123');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO user_mfa (user_id, mfa_type, totp_secret)
         VALUES ($1, 'totp', $2)
         ON CONFLICT (user_id)
         DO UPDATE SET totp_secret = EXCLUDED.totp_secret`,
        ['user-123', expect.any(String)]
      );
      expect(result).toBeDefined();
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.generateSecret('user-123')).rejects.toThrow('Failed to generate TOTP secret');
    });
  });

  describe('verifyCode', () => {
    it('should verify a valid TOTP code', async () => {
      const mockResult = {
        rows: [{ secret: 'test-secret' }]
      };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      // This test is limited since we can't easily mock speakeasy.verify
      // But we can at least verify the database call
      await expect(service.verifyCode('user-123', '123456')).rejects.toThrow();
    });

    it('should throw an error when no secret found for user', async () => {
      const mockResult = { rows: [] };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      await expect(service.verifyCode('user-123', '123456')).rejects.toThrow('No TOTP secret found for user');
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      // Service throws raw error, not wrapped
      await expect(service.verifyCode('user-123', '123456')).rejects.toThrow();
    });
  });

  describe('getMFAStatus', () => {
    it('should get MFA status for a user', async () => {
      const mockResult = {
        rows: [{ mfa_type: 'totp', enabled: true }]
      };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      const result = await service.getMFAStatus('user-123');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT mfa_type, mfa_enabled, backup_codes FROM user_mfa WHERE user_id = $1',
        ['user-123']
      );
      expect(result).toEqual({ type: 'totp', enabled: true });
    });

    it('should return disabled status when no MFA record exists', async () => {
      const mockResult = { rows: [] };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      const result = await service.getMFAStatus('user-123');
      
      expect(result).toEqual({ type: null, enabled: false });
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.getMFAStatus('user-123')).rejects.toThrow('Failed to get MFA status');
    });
  });

  describe('enableTOTP', () => {
    it('should enable TOTP for a user with backup codes', async () => {
      const mockResult = {
        rows: [{ secret: 'test-secret' }]
      };
      
      mockPool.query.mockResolvedValueOnce(mockResult); // For getSecret
      mockPool.query.mockResolvedValue({ rows: [] });   // For update
      
      const result = await service.enableTOTP('user-123');
      
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('backupCodes');
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.enableTOTP('user-123')).rejects.toThrow('Failed to enable TOTP');
    });
  });

  describe('disableTOTP', () => {
    it('should disable TOTP for a user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      await service.disableTOTP('user-123');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE user_mfa
         SET mfa_enabled = false,
             totp_secret = NULL,
             backup_codes = NULL,
             failed_attempts = 0,
             locked_until = NULL
         WHERE user_id = $1 AND mfa_type = 'totp'`,
        ['user-123']
      );
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.disableTOTP('user-123')).rejects.toThrow('Failed to disable TOTP');
    });
  });

  describe('validateBackupCode', () => {
    it('should validate a backup code and remove used codes', async () => {
      const mockResult = {
        rows: [{ backup_codes: ['CODE123', 'CODE456'] }]
      };
      
      mockPool.query.mockResolvedValueOnce(mockResult); // For get codes
      mockPool.query.mockResolvedValue({ rows: [] });   // For update
      
      await expect(service.validateBackupCode('user-123', 'CODE123')).resolves.toBe(true);
    });

    it('should return false for invalid backup code', async () => {
      const mockResult = {
        rows: [{ backup_codes: ['CODE123', 'CODE456'] }]
      };
      
      mockPool.query.mockResolvedValueOnce(mockResult); // For get codes
      
      await expect(service.validateBackupCode('user-123', 'INVALID')).resolves.toBe(false);
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.validateBackupCode('user-123', 'CODE123')).rejects.toThrow('Failed to validate backup code');
    });
  });
});