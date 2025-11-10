/**
 * Generate Secure Secrets Script
 * Creates cryptographically secure secrets for JWT, encryption, and session management
 *
 * Usage:
 *   npm run security:generate-secrets
 *   npm run security:generate-secrets -- --output=.env
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * Generate a cryptographically secure random secret
 */
function generateSecret(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Generate all required secrets
 */
function generateAllSecrets() {
  return {
    JWT_SECRET: generateSecret(32), // 256-bit
    SESSION_SECRET: generateSecret(32), // 256-bit
    ENCRYPTION_KEY: generateSecret(32), // 256-bit
    REFRESH_TOKEN_SECRET: generateSecret(32), // 256-bit
    API_KEY_ENCRYPTION_KEY: generateSecret(32), // 256-bit
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const outputToEnv = args.includes('--output=.env')
  const showValues = args.includes('--show')

  console.log('========================================')
  console.log('🔐 SECURE SECRETS GENERATOR')
  console.log('========================================\n')

  const secrets = generateAllSecrets()

  if (showValues) {
    // Show actual values (for manual copying)
    console.log('Generated Secrets (copy to .env):\n')

    for (const [key, value] of Object.entries(secrets)) {
      console.log(`${key}=${value}`)
    }
  } else {
    // Show masked values
    console.log('Generated Secrets (values masked for security):\n')

    for (const [key, value] of Object.entries(secrets)) {
      const masked = `${value.substring(0, 8)}...${value.substring(value.length - 8)}`
      console.log(`✅ ${key} = ${masked} (${value.length} chars)`)
    }

    console.log('\nTo see actual values: npm run security:generate-secrets -- --show')
  }

  // Update .env file if requested
  if (outputToEnv) {
    const envPath = path.join(process.cwd(), '.env')

    let envContent = ''

    // Read existing .env if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')

      // Backup existing .env
      const backupPath = `${envPath}.backup.${Date.now()}`
      fs.writeFileSync(backupPath, envContent)
      console.log(`\n📁 Backup created: ${backupPath}`)
    } else {
      console.log('\n📄 Creating new .env file...')
    }

    // Update or add secrets
    for (const [key, value] of Object.entries(secrets)) {
      const regex = new RegExp(`^${key}=.*$`, 'm')

      if (regex.test(envContent)) {
        // Replace existing value
        envContent = envContent.replace(regex, `${key}=${value}`)
      } else {
        // Add new value
        envContent += `\n${key}=${value}`
      }
    }

    // Write updated .env
    fs.writeFileSync(envPath, envContent)

    console.log('\n✅ .env file updated with new secrets')
    console.log('⚠️  IMPORTANT: Restart your application to use new secrets')
  }

  console.log('\n========================================')
  console.log('SECURITY REMINDERS')
  console.log('========================================')
  console.log('1. ❌ Never commit .env files to git')
  console.log('2. ✅ Use different secrets for dev/staging/production')
  console.log('3. ✅ Rotate secrets every 90 days')
  console.log('4. ✅ Store production secrets in AWS Secrets Manager')
  console.log('5. ✅ Minimum secret length: 256 bits (64 hex characters)')
  console.log('========================================\n')
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { generateSecret, generateAllSecrets }
