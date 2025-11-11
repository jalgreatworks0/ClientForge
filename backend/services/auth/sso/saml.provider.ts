/**
 * SAML Provider
 * Implements SAML 2.0 SSO authentication for enterprise identity providers
 * Note: This is a basic implementation. For production, consider using saml2-js more extensively
 */

import { SAML } from 'saml2-js';
import { SSOProviderService } from './sso-provider.service';
import { logger } from '../../../utils/logging/logger';
import { getPool } from '../../../database/postgresql/pool';

export interface SAMLUserProfile {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
}

export class SAMLProvider {
  private ssoService: SSOProviderService;
  private pool = getPool();

  constructor() {
    this.ssoService = new SSOProviderService();
  }

  /**
   * Create SAML Service Provider configuration
   */
  createServiceProvider(): SAML.ServiceProvider {
    const spOptions = {
      entity_id: process.env.SAML_ENTITY_ID || `${process.env.API_URL}/api/v1/auth/saml/metadata`,
      private_key: process.env.SAML_PRIVATE_KEY || '',
      certificate: process.env.SAML_CERT || '',
      assert_endpoint: process.env.SAML_CALLBACK_URL ||
                       `${process.env.API_URL}/api/v1/auth/saml/callback`,
      allow_unencrypted_assertion: process.env.NODE_ENV === 'development',
      sign_get_request: true,
      nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    };

    return new SAML.ServiceProvider(spOptions);
  }

  /**
   * Create SAML Identity Provider configuration
   */
  createIdentityProvider(config?: any): SAML.IdentityProvider {
    const idpOptions = {
      sso_login_url: config?.entryPoint || process.env.SAML_ENTRY_POINT || '',
      sso_logout_url: config?.logoutUrl || process.env.SAML_LOGOUT_URL || '',
      certificates: [config?.certificate || process.env.SAML_IDP_CERT || ''],
      force_authn: false,
      sign_get_request: false,
      allow_unencrypted_assertion: process.env.NODE_ENV === 'development'
    };

    return new SAML.IdentityProvider(idpOptions);
  }

  /**
   * Generate SAML login URL
   */
  async getLoginUrl(relayState?: string): Promise<string> {
    try {
      const sp = this.createServiceProvider();
      const idp = this.createIdentityProvider();

      return new Promise((resolve, reject) => {
        sp.create_login_request_url(idp, { relay_state: relayState }, (err, loginUrl) => {
          if (err) {
            reject(err);
          } else {
            logger.info('[SAML] Generated login URL', { relayState });
            resolve(loginUrl);
          }
        });
      });
    } catch (error: any) {
      logger.error('[SAML] Error generating login URL', { error: error.message });
      throw new Error('Failed to generate SAML login URL');
    }
  }

  /**
   * Process SAML assertion from IdP callback
   */
  async processAssertion(samlResponse: string, relayState?: string): Promise<SAMLUserProfile> {
    try {
      const sp = this.createServiceProvider();
      const idp = this.createIdentityProvider();

      const assertion: any = await new Promise((resolve, reject) => {
        sp.post_assert(idp, { request_body: { SAMLResponse: samlResponse } }, (err, samlAssert) => {
          if (err) {
            reject(err);
          } else {
            resolve(samlAssert);
          }
        });
      });

      if (!assertion || !assertion.user) {
        throw new Error('Invalid SAML assertion');
      }

      const userProfile = this.extractUserProfile(assertion);

      logger.info('[SAML] Successfully processed assertion', {
        email: userProfile.email,
        userId: userProfile.userId
      });

      return userProfile;
    } catch (error: any) {
      logger.error('[SAML] Error processing assertion', { error: error.message });
      throw new Error('Failed to process SAML assertion');
    }
  }

  /**
   * Extract user profile from SAML assertion
   */
  private extractUserProfile(assertion: any): SAMLUserProfile {
    const attributes = assertion.user.attributes || {};
    const nameId = assertion.user.name_id;

    // Try multiple common SAML attribute names
    const email =
      attributes.email?.[0] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']?.[0] ||
      attributes['urn:oid:0.9.2342.19200300.100.1.3']?.[0] ||
      nameId;

    const userId =
      attributes.uid?.[0] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']?.[0] ||
      nameId;

    const firstName =
      attributes.firstName?.[0] ||
      attributes.givenName?.[0] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']?.[0];

    const lastName =
      attributes.lastName?.[0] ||
      attributes.surname?.[0] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']?.[0];

    const displayName =
      attributes.displayName?.[0] ||
      attributes.cn?.[0] ||
      attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']?.[0] ||
      `${firstName} ${lastName}`.trim();

    const groups = attributes.groups || attributes.memberOf || [];

    if (!email) {
      throw new Error('Email is required from SAML provider');
    }

    return {
      userId,
      email,
      firstName,
      lastName,
      displayName,
      groups
    };
  }

  /**
   * Generate SAML metadata XML for Service Provider
   */
  generateMetadata(): string {
    const entityId = process.env.SAML_ENTITY_ID || `${process.env.API_URL}/api/v1/auth/saml/metadata`;
    const callbackUrl = process.env.SAML_CALLBACK_URL || `${process.env.API_URL}/api/v1/auth/saml/callback`;
    const logoutUrl = process.env.SAML_LOGOUT_URL || `${process.env.API_URL}/api/v1/auth/saml/logout`;
    const cert = process.env.SAML_CERT || '';

    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${entityId}"
                     validUntil="2030-01-01T00:00:00Z">
  <md:SPSSODescriptor AuthnRequestsSigned="true"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${cert.replace(/\s/g, '')}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${cert.replace(/\s/g, '')}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${logoutUrl}"/>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${callbackUrl}"
                                 index="1"
                                 isDefault="true"/>
    <md:AttributeConsumingService index="1">
      <md:ServiceName xml:lang="en">ClientForge CRM</md:ServiceName>
      <md:RequestedAttribute Name="email"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"
                             isRequired="true"/>
      <md:RequestedAttribute Name="firstName"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"
                             isRequired="false"/>
      <md:RequestedAttribute Name="lastName"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"
                             isRequired="false"/>
    </md:AttributeConsumingService>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    logger.info('[SAML] Generated metadata XML');
    return metadata;
  }

  /**
   * Generate SAML logout request
   */
  async getLogoutUrl(nameId: string, sessionIndex?: string): Promise<string> {
    try {
      const sp = this.createServiceProvider();
      const idp = this.createIdentityProvider();

      return new Promise((resolve, reject) => {
        sp.create_logout_request_url(idp, { name_id: nameId, session_index: sessionIndex }, (err, logoutUrl) => {
          if (err) {
            reject(err);
          } else {
            logger.info('[SAML] Generated logout URL', { nameId });
            resolve(logoutUrl);
          }
        });
      });
    } catch (error: any) {
      logger.error('[SAML] Error generating logout URL', { error: error.message });
      throw new Error('Failed to generate SAML logout URL');
    }
  }

  /**
   * Get configured SAML providers for a tenant
   */
  async getTenantProviders(tenantId: string): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT id, provider_type, provider_name, metadata_url,
                saml_entity_id, saml_sso_url, enabled
         FROM sso_providers
         WHERE tenant_id = $1 AND provider_type = 'saml' AND enabled = true`,
        [tenantId]
      );

      logger.info('[SAML] Fetched tenant SAML providers', {
        tenantId,
        count: result.rows.length
      });

      return result.rows;
    } catch (error: any) {
      logger.error('[SAML] Error fetching providers', { tenantId, error: error.message });
      throw new Error('Failed to fetch SAML providers');
    }
  }

  /**
   * Link SAML account to existing user
   */
  async linkAccountToUser(
    userId: string,
    samlUserId: string,
    email: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'saml' LIMIT 1),
             sso_user_id = $1,
             last_sso_login = NOW()
         WHERE id = $2`,
        [samlUserId, userId]
      );

      logger.info('[SAML] Account linked to user', { userId, email });
    } catch (error: any) {
      logger.error('[SAML] Error linking account', { userId, error: error.message });
      throw new Error('Failed to link SAML account');
    }
  }

  /**
   * Unlink SAML account from user
   */
  async unlinkAccount(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET sso_provider_id = NULL,
             sso_user_id = NULL
         WHERE id = $1 AND sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'saml' LIMIT 1)`,
        [userId]
      );

      logger.info('[SAML] Account unlinked from user', { userId });
    } catch (error: any) {
      logger.error('[SAML] Error unlinking account', { userId, error: error.message });
      throw new Error('Failed to unlink SAML account');
    }
  }

  /**
   * Check if user has SAML account linked
   */
  async isAccountLinked(userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT sso_user_id FROM users
         WHERE id = $1 AND sso_provider_id = (SELECT id FROM sso_providers WHERE provider_type = 'saml' LIMIT 1)`,
        [userId]
      );

      return result.rows.length > 0 && result.rows[0].sso_user_id !== null;
    } catch (error: any) {
      logger.error('[SAML] Error checking account link', { userId, error: error.message });
      return false;
    }
  }
}
