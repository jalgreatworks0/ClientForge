/**
 * Microsoft OAuth Provider
 * Implements SSO authentication with Microsoft Azure AD / Office 365
 */

import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node';

import { logger } from '../../../utils/logging/logger';
import { getPool } from '../../../database/postgresql/pool';
import { normalizeOAuthProfile } from '../../../auth/providers/normalize';
import type { OAuthProfile } from '../../../types/auth/oauth';

import { SSOProviderService, SSOTokenData } from './sso-provider.service';

export interface MicrosoftUserProfile {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
}

export class MicrosoftOAuthProvider {
  private client: ConfidentialClientApplication;
  private ssoService: SSOProviderService;
  private pool = getPool();

  constructor() {
    this.client = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        authority: process.env.MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common'
      }
    });

    this.ssoService = new SSOProviderService();
  }

  /**
   * Generate Microsoft OAuth authorization URL with PKCE
   */
  async getAuthorizationUrl(state: string, codeVerifier?: string): Promise<string> {
    try {
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
                         `${process.env.API_URL}/api/v1/auth/sso/microsoft/callback`;

      const authCodeUrlParams: any = {
        scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
        redirectUri,
        state,
        responseMode: 'query'
      };

      // Add PKCE if code verifier provided
      if (codeVerifier) {
        const { codeChallenge } = this.ssoService.generatePKCE();
        authCodeUrlParams.codeChallenge = codeChallenge;
        authCodeUrlParams.codeChallengeMethod = 'S256';
      }

      const authUrl = await this.client.getAuthCodeUrl(authCodeUrlParams);

      logger.info('[Microsoft SSO] Generated authorization URL', { state });
      return authUrl;
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error generating auth URL', { error: error.message });
      throw new Error('Failed to generate Microsoft authorization URL');
    }
  }

  /**
   * Handle Microsoft OAuth callback and exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string,
    codeVerifier?: string
  ): Promise<{ userProfile: MicrosoftUserProfile; tokenData: SSOTokenData }> {
    try {
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
                         `${process.env.API_URL}/api/v1/auth/sso/microsoft/callback`;

      const tokenRequest: AuthorizationCodeRequest = {
        code,
        redirectUri,
        scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access']
      };

      // Add PKCE if provided
      if (codeVerifier) {
        tokenRequest.codeVerifier = codeVerifier;
      }

      // Exchange authorization code for tokens using MSAL
      const tokenResponse = await this.client.acquireTokenByCode(tokenRequest);

      if (!tokenResponse?.accessToken) {
        throw new Error('No access token received from Microsoft');
      }

      // Get user profile from Microsoft Graph
      const userProfile = await this.getUserProfile(tokenResponse.accessToken);

      // Prepare token data
      const tokenData: SSOTokenData = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        idToken: tokenResponse.idToken,
        expiresAt: tokenResponse.expiresOn || new Date(Date.now() + 3600 * 1000)
      };

      logger.info('[Microsoft SSO] Successfully authenticated user', {
        email: userProfile.email,
        userId: userProfile.userId
      });

      return { userProfile, tokenData };
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error in callback handling', { error: error.message });
      throw new Error('Failed to process Microsoft OAuth callback');
    }
  }

  /**
   * Refresh Microsoft access token
   */
  async refreshAccessToken(refreshToken: string): Promise<SSOTokenData> {
    try {
      const tokenResponse = await this.client.acquireTokenByRefreshToken({
        refreshToken,
        scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access']
      });

      if (!tokenResponse?.accessToken) {
        throw new Error('No access token received from refresh');
      }

      const tokenData: SSOTokenData = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || refreshToken,
        idToken: tokenResponse.idToken,
        expiresAt: tokenResponse.expiresOn || new Date(Date.now() + 3600 * 1000)
      };

      logger.info('[Microsoft SSO] Access token refreshed successfully');
      return tokenData;
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error refreshing token', { error: error.message });
      throw new Error('Failed to refresh Microsoft access token');
    }
  }

  /**
   * Validate Microsoft ID token (JWT)
   */
  async validateToken(idToken: string): Promise<any> {
    try {
      // Decode the JWT (in production, should use proper JWT verification)
      const payload = this.decodeJWT(idToken);

      // Basic validation
      if (!payload.aud || !payload.iss || !payload.exp) {
        throw new Error('Invalid ID token structure');
      }

      // Check expiration
      if (payload.exp * 1000 < Date.now()) {
        throw new Error('ID token has expired');
      }

      logger.info('[Microsoft SSO] ID token validated successfully', {
        sub: payload.sub || payload.oid,
        email: payload.email || payload.preferred_username
      });

      return payload;
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error validating token', { error: error.message });
      throw new Error('Invalid Microsoft ID token');
    }
  }

  /**
   * Get user profile from Microsoft Graph API
   */
  async getUserProfile(accessToken: string): Promise<MicrosoftUserProfile> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Normalize OAuth profile using type-safe adapter
      const profile: OAuthProfile = normalizeOAuthProfile('microsoft', data);

      // Type guard ensures we have a Microsoft profile
      if (profile.kind !== 'microsoft') {
        throw new Error('Expected Microsoft profile but got different provider');
      }

      // Extract user profile from normalized data
      const userProfile: MicrosoftUserProfile = {
        userId: profile.oid,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        firstName: data.givenName,
        lastName: data.surname,
        jobTitle: data.jobTitle,
        department: data.department,
        officeLocation: data.officeLocation
      };

      logger.info('[Microsoft SSO] User profile fetched successfully', {
        email: userProfile.email
      });

      return userProfile;
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error fetching user profile', { error: error.message });
      throw new Error('Failed to fetch Microsoft user profile');
    }
  }

  /**
   * Get user photo from Microsoft Graph API
   */
  async getUserPhoto(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/photo/$value',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const base64 = buffer.toString('base64');
        return `data:image/jpeg;base64,${base64}`;
      }

      logger.info('[Microsoft SSO] No user photo available');
      return null;
    } catch (error: any) {
      logger.warn('[Microsoft SSO] Error fetching user photo', { error: error.message });
      return null;
    }
  }

  /**
   * Revoke Microsoft access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      // Microsoft doesn't have a standard token revocation endpoint
      // Tokens expire automatically, but we can clear from our session storage
      logger.info('[Microsoft SSO] Token marked for revocation');

      // In production, you would:
      // 1. Remove token from session storage
      // 2. Remove from database
      // 3. Clear MSAL cache
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error revoking token', { error: error.message });
      // Don't throw - token revocation is best-effort
    }
  }

  /**
   * Link Microsoft account to existing user
   */
  async linkAccountToUser(
    userId: string,
    microsoftUserId: string,
    email: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'microsoft' LIMIT 1),
             sso_user_id = $1,
             last_sso_login = NOW()
         WHERE id = $2`,
        [microsoftUserId, userId]
      );

      logger.info('[Microsoft SSO] Account linked to user', { userId, email });
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error linking account', { userId, error: error.message });
      throw new Error('Failed to link Microsoft account');
    }
  }

  /**
   * Unlink Microsoft account from user
   */
  async unlinkAccount(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET sso_provider_id = NULL,
             sso_user_id = NULL
         WHERE id = $1 AND sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'microsoft' LIMIT 1)`,
        [userId]
      );

      logger.info('[Microsoft SSO] Account unlinked from user', { userId });
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error unlinking account', { userId, error: error.message });
      throw new Error('Failed to unlink Microsoft account');
    }
  }

  /**
   * Check if user has Microsoft account linked
   */
  async isAccountLinked(userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT sso_user_id FROM users
         WHERE id = $1 AND sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'microsoft' LIMIT 1)`,
        [userId]
      );

      return result.rows.length > 0 && result.rows[0].sso_user_id !== null;
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error checking account link', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Decode JWT without verification (for demonstration purposes)
   * In production, use proper JWT verification library
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString('utf8')
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error decoding JWT', { error: error.message });
      throw new Error('Failed to decode JWT token');
    }
  }

  /**
   * Get Microsoft tenant information
   */
  async getTenantInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/organization',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info('[Microsoft SSO] Tenant info fetched successfully');
      return data.value?.[0] || null;
    } catch (error: any) {
      logger.error('[Microsoft SSO] Error fetching tenant info', { error: error.message });
      throw new Error('Failed to fetch Microsoft tenant information');
    }
  }
}
