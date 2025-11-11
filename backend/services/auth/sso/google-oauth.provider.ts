/**
 * Google OAuth Provider
 * Implements SSO authentication with Google Workspace/Gmail
 */

import { OAuth2Client } from 'google-auth-library';
import { SSOProviderService, SSOTokenData } from './sso-provider.service';
import { logger } from '../../../utils/logging/logger';
import { getPool } from '../../../database/postgresql/pool';

export interface GoogleUserProfile {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  emailVerified?: boolean;
}

export class GoogleOAuthProvider {
  private client: OAuth2Client;
  private ssoService: SSOProviderService;
  private pool = getPool();

  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL}/api/v1/auth/sso/google/callback`
    );

    this.ssoService = new SSOProviderService();
  }

  /**
   * Generate Google OAuth authorization URL with PKCE
   */
  async getAuthorizationUrl(state: string, codeVerifier?: string): Promise<string> {
    try {
      const authUrlOptions: any = {
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'openid'
        ],
        state,
        prompt: 'consent', // Force consent to get refresh token
        include_granted_scopes: true
      };

      // Add PKCE if code verifier provided
      if (codeVerifier) {
        const { codeChallenge } = this.ssoService.generatePKCE();
        authUrlOptions.code_challenge = codeChallenge;
        authUrlOptions.code_challenge_method = 'S256';
      }

      const authUrl = this.client.generateAuthUrl(authUrlOptions);

      logger.info('[Google SSO] Generated authorization URL', { state });
      return authUrl;
    } catch (error: any) {
      logger.error('[Google SSO] Error generating auth URL', { error: error.message });
      throw new Error('Failed to generate Google authorization URL');
    }
  }

  /**
   * Handle Google OAuth callback and exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string,
    codeVerifier?: string
  ): Promise<{ userProfile: GoogleUserProfile; tokenData: SSOTokenData }> {
    try {
      // Exchange authorization code for tokens
      const tokenRequest: any = { code };
      if (codeVerifier) {
        tokenRequest.code_verifier = codeVerifier;
      }

      const { tokens } = await this.client.getToken(tokenRequest);

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Verify the ID token
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid Google OAuth response');
      }

      // Extract user profile
      const userProfile: GoogleUserProfile = {
        userId: payload.sub,
        email: payload.email!,
        name: payload.name || `${payload.given_name} ${payload.family_name}`,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      };

      // Prepare token data
      const tokenData: SSOTokenData = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000)
      };

      logger.info('[Google SSO] Successfully authenticated user', {
        email: userProfile.email,
        userId: userProfile.userId
      });

      return { userProfile, tokenData };
    } catch (error: any) {
      logger.error('[Google SSO] Error in callback handling', { error: error.message });
      throw new Error('Failed to process Google OAuth callback');
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshAccessToken(refreshToken: string): Promise<SSOTokenData> {
    try {
      this.client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await this.client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh');
      }

      const tokenData: SSOTokenData = {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        idToken: credentials.id_token,
        expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
      };

      logger.info('[Google SSO] Access token refreshed successfully');
      return tokenData;
    } catch (error: any) {
      logger.error('[Google SSO] Error refreshing token', { error: error.message });
      throw new Error('Failed to refresh Google access token');
    }
  }

  /**
   * Validate Google ID token directly
   */
  async validateToken(idToken: string): Promise<any> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid ID token payload');
      }

      logger.info('[Google SSO] ID token validated successfully', {
        sub: payload.sub,
        email: payload.email
      });

      return payload;
    } catch (error: any) {
      logger.error('[Google SSO] Error validating token', { error: error.message });
      throw new Error('Invalid Google ID token');
    }
  }

  /**
   * Get user profile from Google UserInfo API
   */
  async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const userProfile: GoogleUserProfile = {
        userId: data.id,
        email: data.email,
        name: data.name,
        firstName: data.given_name,
        lastName: data.family_name,
        picture: data.picture,
        emailVerified: data.verified_email
      };

      logger.info('[Google SSO] User profile fetched successfully', {
        email: userProfile.email
      });

      return userProfile;
    } catch (error: any) {
      logger.error('[Google SSO] Error fetching user profile', { error: error.message });
      throw new Error('Failed to fetch Google user profile');
    }
  }

  /**
   * Revoke Google access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        { method: 'POST' }
      );

      if (response.ok) {
        logger.info('[Google SSO] Token revoked successfully');
      } else {
        logger.warn('[Google SSO] Token revocation returned non-OK status', {
          status: response.status
        });
      }
    } catch (error: any) {
      logger.error('[Google SSO] Error revoking token', { error: error.message });
      // Don't throw - token revocation is best-effort
    }
  }

  /**
   * Link Google account to existing user
   */
  async linkAccountToUser(
    userId: string,
    googleUserId: string,
    email: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'google' LIMIT 1),
             sso_user_id = $1,
             last_sso_login = NOW()
         WHERE id = $2`,
        [googleUserId, userId]
      );

      logger.info('[Google SSO] Account linked to user', { userId, email });
    } catch (error: any) {
      logger.error('[Google SSO] Error linking account', { userId, error: error.message });
      throw new Error('Failed to link Google account');
    }
  }

  /**
   * Unlink Google account from user
   */
  async unlinkAccount(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET sso_provider_id = NULL,
             sso_user_id = NULL
         WHERE id = $1 AND sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'google' LIMIT 1)`,
        [userId]
      );

      logger.info('[Google SSO] Account unlinked from user', { userId });
    } catch (error: any) {
      logger.error('[Google SSO] Error unlinking account', { userId, error: error.message });
      throw new Error('Failed to unlink Google account');
    }
  }

  /**
   * Check if user has Google account linked
   */
  async isAccountLinked(userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT sso_user_id FROM users
         WHERE id = $1 AND sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'google' LIMIT 1)`,
        [userId]
      );

      return result.rows.length > 0 && result.rows[0].sso_user_id !== null;
    } catch (error: any) {
      logger.error('[Google SSO] Error checking account link', { userId, error: error.message });
      return false;
    }
  }
}
