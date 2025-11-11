# SSO + MFA Authentication System

## Overview

This document describes the implementation of the Single Sign-On (SSO) and Multi-Factor Authentication (MFA) system for ClientForge CRM v3.0, following the blueprint specification.

## Architecture

### Core Components

1. **SSO Provider Service** (`backend/services/auth/sso/sso-provider.service.ts`)
   - Manages SSO provider configurations
   - Handles authentication flows for different providers
   - Stores and retrieves SSO tokens

2. **Google OAuth Provider** (`backend/services/auth/sso/google-oauth.provider.ts`)
   - Implements Google OAuth 2.0 flow
   - Validates Google ID tokens
   - Fetches user profile information

3. **Microsoft OAuth Provider** (`backend/services/auth/sso/microsoft-oauth.provider.ts`)
   - Implements Microsoft Azure AD OAuth 2.0 flow  
   - Handles MSAL (Microsoft Authentication Library) integration
   - Fetches user information from Microsoft Graph API

4. **SAML Provider** (`backend/services/auth/sso/saml.provider.ts`)
   - Implements SAML 2.0 authentication protocol
   - Handles SAML metadata and assertion processing
   - Supports enterprise SSO scenarios

5. **TOTP Service** (`backend/services/auth/mfa/totp.service.ts`)
   - Generates and manages TOTP (Time-based One-Time Password) secrets
   - Validates TOTP codes for verification
   - Manages backup codes generation and validation

6. **Backup Codes Service** (`backend/services/auth/mfa/backup-codes.service.ts`)
   - Generates and stores backup authentication codes
   - Handles code consumption and validation
   - Provides recovery mechanisms when primary MFA is unavailable

### API Endpoints

#### SSO Routes
```
POST /api/v1/auth/sso/initiate      - Initiate SSO login flow
GET  /api/v1/auth/sso/providers     - Get available SSO providers for tenant
POST /api/v1/auth/sso/callback      - Handle OAuth callback from identity provider
```

#### MFA Routes  
```
GET  /api/v1/auth/mfa/status        - Check user's MFA status
POST /api/v1/auth/mfa/setup/totp    - Enable TOTP MFA for user
POST /api/v1/auth/mfa/verify        - Verify MFA code during login
POST /api/v1/auth/mfa/backup-codes/generate  - Generate backup codes
```

### Frontend Components

1. **SSOLoginButton** (`frontend/components/Auth/SSO/SSOLoginButton.tsx`)
   - React component for SSO login buttons
   - Supports Google, Microsoft, and SAML providers
   - Handles redirect to OAuth provider

2. **MFASetup** (`frontend/components/Auth/MFA/MFASetup.tsx`)
   - Complete MFA setup flow with QR code generation
   - Backup codes display and download functionality  
   - Step-by-step verification process

3. **TOTPVerification** (`frontend/components/Auth/MFA/TOTPVerification.tsx`)
   - Simple TOTP verification form
   - Real-time validation of 6-digit codes
   - Error handling and user feedback

## Database Schema

### Tables

1. **sso_providers**
   - Stores configuration for SSO providers (Google, Microsoft, SAML)
   - Contains client IDs, secrets, and metadata URLs
   - Links to tenant organizations

2. **user_mfa**  
   - Manages user MFA settings
   - Stores TOTP secrets and backup codes
   - Tracks enabled status per user

3. **user_sso_tokens**
   - Stores SSO access tokens for users
   - Supports refresh token management
   - Links to specific identity providers

4. **user_mfa_backup_codes**
   - Stores generated backup authentication codes
   - Each code is single-use and removed after validation
   - Provides recovery mechanism when primary MFA fails

## Security Features

1. **CSRF Protection**: All OAuth flows include state parameter for CSRF protection
2. **PKCE Support**: PKCE (Proof Key for Code Exchange) for enhanced security in OAuth flows
3. **Encrypted Storage**: Sensitive data like secrets and tokens are stored encrypted
4. **Rate Limiting**: API endpoints have rate limiting to prevent abuse
5. **Audit Logging**: All authentication events are logged for security monitoring
6. **Token Validation**: Proper validation of access and refresh tokens from providers

## Implementation Status

✅ **Core Components Implemented**
- SSO provider service with Google/Microsoft/SAML support
- TOTP MFA implementation with backup codes
- API endpoints for all required operations
- Frontend UI components for setup and verification

⚠️ **Pending Tasks** 
- Integration with actual OAuth providers in production environment
- Complete SAML integration (metadata handling, signature validation)
- Testing with real identity providers
- Advanced security features like device trust scores

## Configuration Requirements

### Environment Variables
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret  
GOOGLE_REDIRECT_URI=https://clientforge.com/auth/google/callback
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_REDIRECT_URI=https://clientforge.com/auth/microsoft/callback
SAML_ENTRY_POINT=https://sso.example.com/saml/entry
SAML_CALLBACK_URL=https://clientforge.com/api/v1/auth/saml/callback
SAML_CERT=base64-encoded-certificate
```

## Testing

The system includes comprehensive tests for:
- Provider initialization and configuration
- Token validation and refresh flows  
- MFA setup and verification processes
- Backup code generation and consumption
- Error handling in all authentication scenarios

All tests follow the 85%+ coverage requirement.

## Migration Instructions

To migrate existing users to this SSO/MFA system:

1. **Database Migration**: Run `20251110_sso_mfa_tables.ts` migration script
2. **Environment Configuration**: Set required environment variables for each provider
3. **Provider Setup**: Configure each identity provider with appropriate redirect URIs  
4. **User Onboarding**: Existing users can enable SSO/MFA through the UI or API

## Performance Considerations

- All database operations use parameterized queries to prevent SQL injection
- Token storage uses efficient indexing on user_id and provider_type columns  
- MFA verification is optimized with proper caching of secrets
- Backup codes are stored in arrays for fast lookup and validation

## Future Enhancements

1. **Advanced Device Trust**: Implement device fingerprinting and trust scoring
2. **Biometric Authentication**: Support for fingerprint, facial recognition, and other biometrics
3. **FIDO2/WebAuthn**: Hardware security key support  
4. **Passwordless Authentication**: Email magic links and push notifications
5. **Compliance Integration**: SOC 2, GDPR, HIPAA compliance features
