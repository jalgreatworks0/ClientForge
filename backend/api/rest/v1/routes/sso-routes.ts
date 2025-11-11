/**
 * SSO & MFA Routes
 * Handles Single Sign-On authentication and Multi-Factor Authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../../../middleware/authenticate';
import { rateLimiters } from '../../../../middleware/rate-limit';
import { SSOProviderService } from '../../../../services/auth/sso/sso-provider.service';
import { GoogleOAuthProvider } from '../../../../services/auth/sso/google-oauth.provider';
import { MicrosoftOAuthProvider } from '../../../../services/auth/sso/microsoft-oauth.provider';
import { SAMLProvider } from '../../../../services/auth/sso/saml.provider';
import { TOTPService } from '../../../../services/auth/mfa/totp.service';
import { logger } from '../../../../utils/logging/logger';

const router = Router();
const ssoService = new SSOProviderService();
const totpService = new TOTPService();

/**
 * SSO ROUTES
 */

// Get available SSO providers for tenant
router.get('/sso/providers',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant ID required',
          message: 'User must be associated with a tenant'
        });
      }

      const providers = await ssoService.getSSOProviders(tenantId);

      res.json({
        success: true,
        providers: providers.map(p => ({
          id: p.id,
          type: p.provider_type,
          name: p.provider_name,
          enabled: p.enabled,
          autoProvision: p.auto_provision
        }))
      });
    } catch (error: any) {
      logger.error('[SSO Routes] Error fetching providers', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch SSO providers',
        message: error.message
      });
    }
  }
);

// Initiate SSO login flow
router.post('/sso/:provider/initiate',
  rateLimiters.auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant ID required'
        });
      }

      // Generate state token for CSRF protection
      const state = ssoService.generateStateToken();

      // Generate PKCE code verifier
      const { codeVerifier, codeChallenge } = ssoService.generatePKCE();

      let authUrl: string;

      switch (provider) {
        case 'google': {
          const googleProvider = new GoogleOAuthProvider();
          authUrl = await googleProvider.getAuthorizationUrl(state, codeVerifier);
          break;
        }
        case 'microsoft': {
          const microsoftProvider = new MicrosoftOAuthProvider();
          authUrl = await microsoftProvider.getAuthorizationUrl(state, codeVerifier);
          break;
        }
        case 'saml': {
          const samlProvider = new SAMLProvider();
          authUrl = await samlProvider.getLoginUrl(state);
          break;
        }
        default:
          return res.status(400).json({
            error: 'Unsupported SSO provider',
            message: `Provider '${provider}' is not supported`
          });
      }

      // Store state and code verifier in session or temporary cache
      // (In production, use Redis or session store)
      req.session = req.session || {};
      req.session.ssoState = state;
      req.session.codeVerifier = codeVerifier;

      logger.info('[SSO Routes] SSO flow initiated', { provider, tenantId });

      res.json({
        success: true,
        authUrl,
        state
      });
    } catch (error: any) {
      logger.error('[SSO Routes] Error initiating SSO', { error: error.message });
      res.status(500).json({
        error: 'Failed to initiate SSO',
        message: error.message
      });
    }
  }
);

// Handle SSO callback (OAuth/SAML)
router.post('/sso/:provider/callback',
  rateLimiters.auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.params;
      const { code, state, samlResponse } = req.body;

      // Validate state token (CSRF protection)
      if (state && req.session?.ssoState !== state) {
        return res.status(400).json({
          error: 'Invalid state token',
          message: 'CSRF validation failed'
        });
      }

      const codeVerifier = req.session?.codeVerifier;

      let userProfile: any;
      let tokenData: any;

      switch (provider) {
        case 'google': {
          const googleProvider = new GoogleOAuthProvider();
          const result = await googleProvider.handleCallback(code, state, codeVerifier);
          userProfile = result.userProfile;
          tokenData = result.tokenData;
          break;
        }
        case 'microsoft': {
          const microsoftProvider = new MicrosoftOAuthProvider();
          const result = await microsoftProvider.handleCallback(code, state, codeVerifier);
          userProfile = result.userProfile;
          tokenData = result.tokenData;
          break;
        }
        case 'saml': {
          const samlProvider = new SAMLProvider();
          userProfile = await samlProvider.processAssertion(samlResponse, state);
          tokenData = null; // SAML doesn't use OAuth tokens
          break;
        }
        default:
          return res.status(400).json({
            error: 'Unsupported SSO provider'
          });
      }

      // Clean up session
      if (req.session) {
        delete req.session.ssoState;
        delete req.session.codeVerifier;
      }

      logger.info('[SSO Routes] SSO callback processed', {
        provider,
        email: userProfile.email
      });

      res.json({
        success: true,
        user: {
          email: userProfile.email,
          name: userProfile.name || userProfile.displayName,
          userId: userProfile.userId,
          provider
        },
        requiresMFA: false // Check if user has MFA enabled
      });
    } catch (error: any) {
      logger.error('[SSO Routes] Error processing SSO callback', { error: error.message });
      res.status(500).json({
        error: 'Failed to process SSO callback',
        message: error.message
      });
    }
  }
);

// Link SSO account to existing user
router.post('/sso/:provider/link',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.params;
      const { ssoUserId, ssoEmail } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      switch (provider) {
        case 'google': {
          const googleProvider = new GoogleOAuthProvider();
          await googleProvider.linkAccountToUser(userId, ssoUserId, ssoEmail);
          break;
        }
        case 'microsoft': {
          const microsoftProvider = new MicrosoftOAuthProvider();
          await microsoftProvider.linkAccountToUser(userId, ssoUserId, ssoEmail);
          break;
        }
        case 'saml': {
          const samlProvider = new SAMLProvider();
          await samlProvider.linkAccountToUser(userId, ssoUserId, ssoEmail);
          break;
        }
        default:
          return res.status(400).json({ error: 'Unsupported SSO provider' });
      }

      logger.info('[SSO Routes] SSO account linked', { userId, provider });

      res.json({
        success: true,
        message: 'SSO account linked successfully'
      });
    } catch (error: any) {
      logger.error('[SSO Routes] Error linking SSO account', { error: error.message });
      res.status(500).json({
        error: 'Failed to link SSO account',
        message: error.message
      });
    }
  }
);

// Unlink SSO account from user
router.delete('/sso/:provider/unlink',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      switch (provider) {
        case 'google': {
          const googleProvider = new GoogleOAuthProvider();
          await googleProvider.unlinkAccount(userId);
          break;
        }
        case 'microsoft': {
          const microsoftProvider = new MicrosoftOAuthProvider();
          await microsoftProvider.unlinkAccount(userId);
          break;
        }
        case 'saml': {
          const samlProvider = new SAMLProvider();
          await samlProvider.unlinkAccount(userId);
          break;
        }
        default:
          return res.status(400).json({ error: 'Unsupported SSO provider' });
      }

      logger.info('[SSO Routes] SSO account unlinked', { userId, provider });

      res.json({
        success: true,
        message: 'SSO account unlinked successfully'
      });
    } catch (error: any) {
      logger.error('[SSO Routes] Error unlinking SSO account', { error: error.message });
      res.status(500).json({
        error: 'Failed to unlink SSO account',
        message: error.message
      });
    }
  }
);

/**
 * MFA ROUTES
 */

// Get MFA status for current user
router.get('/mfa/status',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const mfaStatus = await totpService.getMFAStatus(userId);

      res.json({
        success: true,
        mfa: {
          enabled: mfaStatus.enabled,
          type: mfaStatus.type,
          backupCodesRemaining: mfaStatus.backupCodesRemaining || 0
        }
      });
    } catch (error: any) {
      logger.error('[MFA Routes] Error getting MFA status', { error: error.message });
      res.status(500).json({
        error: 'Failed to get MFA status',
        message: error.message
      });
    }
  }
);

// Setup TOTP MFA (generates QR code)
router.post('/mfa/totp/setup',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const setupData = await totpService.enableTOTP(userId, userEmail);

      logger.info('[MFA Routes] TOTP setup initiated', { userId });

      res.json({
        success: true,
        totp: {
          secret: setupData.secret,
          qrCode: setupData.qrCode,
          provisioningUrl: setupData.provisioningUrl,
          backupCodes: setupData.backupCodes
        }
      });
    } catch (error: any) {
      logger.error('[MFA Routes] Error setting up TOTP', { error: error.message });
      res.status(500).json({
        error: 'Failed to setup TOTP',
        message: error.message
      });
    }
  }
);

// Verify TOTP code
router.post('/mfa/totp/verify',
  rateLimiters.auth,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          error: 'Invalid code format',
          message: 'TOTP code must be 6 digits'
        });
      }

      const isValid = await totpService.verifyCode(userId, code);

      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid verification code',
          message: 'The provided TOTP code is invalid or expired'
        });
      }

      logger.info('[MFA Routes] TOTP verified successfully', { userId });

      res.json({
        success: true,
        message: 'TOTP verification successful'
      });
    } catch (error: any) {
      logger.error('[MFA Routes] Error verifying TOTP', { error: error.message });

      // Handle account lockout
      if (error.message.includes('Account locked')) {
        return res.status(429).json({
          error: 'Account locked',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to verify TOTP',
        message: error.message
      });
    }
  }
);

// Verify backup code
router.post('/mfa/backup-code/verify',
  rateLimiters.auth,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!code || !/^[A-F0-9]{8}$/i.test(code)) {
        return res.status(400).json({
          error: 'Invalid code format',
          message: 'Backup code must be 8 hexadecimal characters'
        });
      }

      const isValid = await totpService.validateBackupCode(userId, code);

      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid backup code',
          message: 'The provided backup code is invalid or already used'
        });
      }

      logger.info('[MFA Routes] Backup code verified successfully', { userId });

      res.json({
        success: true,
        message: 'Backup code verification successful'
      });
    } catch (error: any) {
      logger.error('[MFA Routes] Error verifying backup code', { error: error.message });
      res.status(500).json({
        error: 'Failed to verify backup code',
        message: error.message
      });
    }
  }
);

// Generate new backup codes
router.post('/mfa/backup-codes/regenerate',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const backupCodes = await totpService.generateRecoveryCodes(userId);

      logger.info('[MFA Routes] Backup codes regenerated', { userId });

      res.json({
        success: true,
        backupCodes
      });
    } catch (error: any) {
      logger.error('[MFA Routes] Error regenerating backup codes', { error: error.message });
      res.status(500).json({
        error: 'Failed to regenerate backup codes',
        message: error.message
      });
    }
  }
);

// Disable MFA
router.post('/mfa/disable',
  rateLimiters.api,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { password } = req.body; // Require password confirmation

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Password confirmation is required to disable MFA'
        });
      }

      // TODO: Verify password before disabling MFA

      await totpService.disableTOTP(userId);

      logger.info('[MFA Routes] MFA disabled', { userId });

      res.json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } catch (error: any) {
      logger.error('[MFA Routes] Error disabling MFA', { error: error.message });
      res.status(500).json({
        error: 'Failed to disable MFA',
        message: error.message
      });
    }
  }
);

export default router;
