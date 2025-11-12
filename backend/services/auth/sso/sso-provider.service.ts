/**
 * SSO Provider Service
 * Centralized service for managing SSO provider configurations and operations
 */

import * as crypto from 'crypto';

import { OAuth2Client } from 'google-auth-library';
import { ConfidentialClientApplication } from '@azure/msal-node';

import { getPool } from '../../../database/postgresql/pool';
import { logger } from '../../../utils/logging/logger';


export interface SSOProviderConfig {
  clientId: string;
  clientSecret: string;
  metadataUrl?: string;
  redirectUri?: string;
}

export interface SSOTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  idToken?: string;
}

export class SSOProviderService {
  private pool = getPool();

  /**
   * Get all configured SSO providers for a tenant
   */
  async getSSOProviders(tenantId: string) {
    try {
      const result = await this.pool.query(
        `SELECT id, provider_type, provider_name, client_id, enabled, auto_provision
         FROM sso_providers
         WHERE tenantId = $1 AND enabled = true`,
        [tenantId]
      );

      return result.rows;
    } catch (error: any) {
      logger.error('[SSO] Error fetching providers', { tenantId, error: error.message });
      throw new Error('Failed to fetch SSO providers');
    }
  }

  /**
   * Get a specific SSO provider by type for a tenant
   */
  async getSSOProvider(tenantId: string, providerType: string) {
    try {
      const result = await this.pool.query(
        `SELECT id, provider_type, provider_name, client_id, client_secret,
                metadata_url, enabled, auto_provision, config
         FROM sso_providers
         WHERE tenantId = $1 AND provider_type = $2 AND enabled = true`,
        [tenantId, providerType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Decrypt client_secret before returning
      const provider = result.rows[0];
      if (provider.client_secret) {
        provider.client_secret = this.decryptSecret(provider.client_secret);
      }

      return provider;
    } catch (error: any) {
      logger.error('[SSO] Error fetching provider', { tenantId, providerType, error: error.message });
      throw new Error('Failed to fetch SSO provider');
    }
  }

  /**
   * Create a new SSO provider configuration
   */
  async createSSOProvider(tenantId: string, providerType: string, config: SSOProviderConfig, createdBy: string) {
    try {
      // Encrypt client_secret before storing
      const encryptedSecret = this.encryptSecret(config.clientSecret);

      const result = await this.pool.query(
        `INSERT INTO sso_providers (
          tenantId, provider_type, client_id, client_secret,
          metadata_url, enabled, created_by
        )
        VALUES ($1, $2, $3, $4, $5, true, $6)
        RETURNING id, provider_type, client_id, enabled`,
        [
          tenantId,
          providerType,
          config.clientId,
          encryptedSecret,
          config.metadataUrl || null,
          createdBy
        ]
      );

      logger.info('[SSO] Created new SSO provider', {
        tenantId,
        providerType,
        providerId: result.rows[0].id
      });

      return result.rows[0];
    } catch (error: any) {
      logger.error('[SSO] Error creating provider', { tenantId, providerType, error: error.message });
      throw new Error('Failed to create SSO provider');
    }
  }

  /**
   * Update an existing SSO provider configuration
   */
  async updateSSOProvider(
    providerId: string,
    tenantId: string,
    config: Partial<SSOProviderConfig>
  ) {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (config.clientId) {
        updates.push(`client_id = $${paramIndex++}`);
        values.push(config.clientId);
      }

      if (config.clientSecret) {
        updates.push(`client_secret = $${paramIndex++}`);
        values.push(this.encryptSecret(config.clientSecret));
      }

      if (config.metadataUrl !== undefined) {
        updates.push(`metadata_url = $${paramIndex++}`);
        values.push(config.metadataUrl);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(providerId, tenantId);

      const result = await this.pool.query(
        `UPDATE sso_providers
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND tenantId = $${paramIndex++}
         RETURNING id`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('SSO provider not found');
      }

      logger.info('[SSO] Updated SSO provider', { providerId, tenantId });
      return result.rows[0];
    } catch (error: any) {
      logger.error('[SSO] Error updating provider', { providerId, error: error.message });
      throw error;
    }
  }

  /**
   * Store SSO session with encrypted tokens
   */
  async storeSSOSession(
    userId: string,
    providerId: string,
    ssoUserId: string,
    ssoEmail: string,
    tokenData: SSOTokenData,
    stateToken?: string
  ) {
    try {
      // Encrypt tokens before storing
      const encryptedAccessToken = this.encryptSecret(tokenData.accessToken);
      const encryptedRefreshToken = tokenData.refreshToken
        ? this.encryptSecret(tokenData.refreshToken)
        : null;

      await this.pool.query(
        `INSERT INTO sso_sessions (
          user_id, provider_id, sso_user_id, sso_email, state_token,
          access_token, refresh_token, id_token, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          providerId,
          ssoUserId,
          ssoEmail,
          stateToken || null,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenData.idToken || null,
          tokenData.expiresAt
        ]
      );

      logger.info('[SSO] Session stored for user', { userId, providerId });
    } catch (error: any) {
      logger.error('[SSO] Error storing session', { userId, error: error.message });
      throw new Error('Failed to store SSO session');
    }
  }

  /**
   * Get active SSO session for a user
   */
  async getSSOSession(userId: string, providerId: string) {
    try {
      const result = await this.pool.query(
        `SELECT id, sso_user_id, sso_email, access_token, refresh_token,
                id_token, expires_at, created_at
         FROM sso_sessions
         WHERE user_id = $1 AND provider_id = $2
         AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, providerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];

      // Decrypt tokens
      session.access_token = this.decryptSecret(session.access_token);
      if (session.refresh_token) {
        session.refresh_token = this.decryptSecret(session.refresh_token);
      }

      return session;
    } catch (error: any) {
      logger.error('[SSO] Error fetching session', { userId, error: error.message });
      throw new Error('Failed to fetch SSO session');
    }
  }

  /**
   * Generate OAuth2 authorization URL with PKCE
   */
  async generateAuthUrl(
    tenantId: string,
    providerType: string,
    state: string,
    codeVerifier?: string
  ): Promise<string> {
    const provider = await this.getSSOProvider(tenantId, providerType);

    if (!provider) {
      throw new Error(`SSO provider ${providerType} not configured for tenant`);
    }

    switch (providerType) {
      case 'google':
        return this.generateGoogleAuthUrl(provider, state, codeVerifier);
      case 'microsoft':
        return this.generateMicrosoftAuthUrl(provider, state, codeVerifier);
      case 'saml':
        return this.generateSAMLAuthUrl(provider);
      default:
        throw new Error('Unsupported SSO provider');
    }
  }

  /**
   * Generate Google OAuth URL with PKCE
   */
  private generateGoogleAuthUrl(provider: any, state: string, codeVerifier?: string): string {
    const googleClient = new OAuth2Client(
      provider.client_id,
      provider.client_secret,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL}/api/v1/auth/sso/google/callback`
    );

    const authUrlOptions: any = {
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      state,
      prompt: 'consent'
    };

    // Add PKCE if code verifier provided
    if (codeVerifier) {
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      authUrlOptions.code_challenge = codeChallenge;
      authUrlOptions.code_challenge_method = 'S256';
    }

    return googleClient.generateAuthUrl(authUrlOptions);
  }

  /**
   * Generate Microsoft OAuth URL with PKCE
   */
  private generateMicrosoftAuthUrl(provider: any, state: string, codeVerifier?: string): string {
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
                       `${process.env.API_URL}/api/v1/auth/sso/microsoft/callback`;

    const params: any = {
      client_id: provider.client_id,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid profile email User.Read',
      state,
      response_mode: 'query'
    };

    // Add PKCE if code verifier provided
    if (codeVerifier) {
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }

    const queryString = new URLSearchParams(params).toString();
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${queryString}`;
  }

  /**
   * Generate SAML authentication URL
   */
  private generateSAMLAuthUrl(provider: any): string {
    // Return SAML metadata URL or IdP login endpoint
    if (provider.metadata_url) {
      return provider.metadata_url;
    }

    // Construct SAML request URL
    const samlConfig = provider.config || {};
    return samlConfig.entryPoint || `${process.env.API_URL}/api/v1/auth/sso/saml/login`;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate secure state token for CSRF protection
   */
  generateStateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Encrypt sensitive data (secrets, tokens)
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.SSO_ENCRYPTION_KEY || crypto.randomBytes(32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted,
    });
  }

  /**
   * Decrypt sensitive data (secrets, tokens)
   */
  private decryptSecret(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.SSO_ENCRYPTION_KEY || crypto.randomBytes(32));
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
   * Validate state token to prevent CSRF
   */
  async validateStateToken(state: string, userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT id FROM sso_sessions
         WHERE state_token = $1 AND user_id = $2
         AND created_at > NOW() - INTERVAL '10 minutes'`,
        [state, userId]
      );

      return result.rows.length > 0;
    } catch (error: any) {
      logger.error('[SSO] Error validating state token', { error: error.message });
      return false;
    }
  }

  /**
   * Clean up expired SSO sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM sso_sessions
         WHERE expires_at < NOW() - INTERVAL '30 days'`
      );

      logger.info('[SSO] Cleaned up expired sessions', { count: result.rowCount });
      return result.rowCount || 0;
    } catch (error: any) {
      logger.error('[SSO] Error cleaning up sessions', { error: error.message });
      throw new Error('Failed to cleanup expired sessions');
    }
  }
}
