/**
 * Multi-Factor Authentication Configuration
 */
export const MFAModuleConfig = {
  // TOTP Settings
  totp: {
    issuer: 'ClientForge CRM',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    window: 6, // Allow codes from 3 steps before/after current time (3 minutes)
  },
  
  // Backup Codes Settings
  backupCodes: {
    count: 10, // Number of backup codes to generate
    length: 8, // Length of each backup code
    format: 'HEX', // Format for backup codes (HEX, ALPHA, ALPHANUM)
  },
  
  // Security Settings
  security: {
    maxAttempts: 5, // Maximum failed attempts before lockout
    lockoutDuration: 30 * 60 * 1000, // 30 minutes lockout duration (in ms)
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours session timeout
  },
  
  // User Experience Settings
  userExperience: {
    gracePeriod: 5 * 60 * 1000, // 5 minutes for code verification grace period
    recoveryMethods: ['email', 'sms'], // Available recovery methods
  },
};

export type MFAModuleConfigType = typeof MFAModuleConfig;