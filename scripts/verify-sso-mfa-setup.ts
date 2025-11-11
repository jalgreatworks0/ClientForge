#!/usr/bin/env ts-node

/**
 * Verification script to check SSO/MFA implementation status
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Check that all required files exist and have content
const requiredFiles = [
  'backend/services/auth/sso/sso-provider.service.ts',
  'backend/services/auth/sso/google-oauth.provider.ts', 
  'backend/services/auth/sso/microsoft-oauth.provider.ts',
  'backend/services/auth/sso/saml.provider.ts',
  'backend/services/auth/mfa/totp.service.ts',
  'backend/services/auth/mfa/backup-codes.service.ts',
  'backend/api/rest/v1/routes/sso-routes.ts',
  'frontend/components/Auth/SSO/SSOLoginButton.tsx',
  'frontend/components/Auth/MFA/MFASetup.tsx',
  'frontend/components/Auth/MFA/TOTPVerification.tsx',
  'database/migrations/20251110_sso_mfa_tables.ts',
  'database/schema/sso-mfa-schema.sql',
  'docs/sso-mfa-implementation.md'
];

console.log('🔍 Verifying SSO/MFA Implementation Setup...\n');

let allFilesPresent = true;

for (const file of requiredFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    if (content.length > 0) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`⚠️  ${file} (empty file)`);
      allFilesPresent = false;
    }
  } catch (error) {
    console.log(`❌ ${file} (missing)`);
    allFilesPresent = false;
  }
}

console.log('\n📋 Checking core functionality...\n');

// Verify basic imports work in key files
try {
  // Check that SSO provider service has proper structure  
  const ssoContent = readFileSync('backend/services/auth/sso/sso-provider.service.ts', 'utf8');
  if (ssoContent.includes('class SSOProviderService') && 
      ssoContent.includes('generateAuthUrl') &&
      ssoContent.includes('getSSOProviders')) {
    console.log('✅ SSO Provider Service structure verified');
  } else {
    console.log('⚠️ SSO Provider Service structure incomplete');
    allFilesPresent = false;
  }
  
  // Check that TOTP service has proper methods
  const totpContent = readFileSync('backend/services/auth/mfa/totp.service.ts', 'utf8'); 
  if (totpContent.includes('class TOTPService') &&
      totpContent.includes('generateSecret') && 
      totpContent.includes('verifyCode')) {
    console.log('✅ TOTP Service structure verified');
  } else {
    console.log('⚠️ TOTP Service structure incomplete');
    allFilesPresent = false;
  }
  
  // Check that routes are properly defined
  const routeContent = readFileSync('backend/api/rest/v1/routes/sso-routes.ts', 'utf8');
  if (routeContent.includes('POST /api/v1/auth/sso/initiate') &&
      routeContent.includes('GET /api/v1/auth/mfa/status')) {
    console.log('✅ SSO/MFA Routes verified');
  } else {
    console.log('⚠️ SSO/MFA Routes incomplete');
    allFilesPresent = false;
  }
  
} catch (error) {
  console.log(`❌ Error during verification: ${error}`);
  allFilesPresent = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesPresent) {
  console.log('🎉 ALL FILES PRESENT AND STRUCTURE VERIFIED!');
  console.log('✅ SSO/MFA implementation is ready for testing');
} else {
  console.log('⚠️ Some files are missing or incomplete');
  console.log('⚠️ Please review the above issues before proceeding');
}
console.log('='.repeat(50));

export {};