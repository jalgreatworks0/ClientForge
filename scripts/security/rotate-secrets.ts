/**
 * Secret Rotation Script
 * Rotates JWT secrets and API keys securely
 *
 * Usage:
 *   npm run security:rotate-secrets
 *   npm run security:rotate-secrets -- --secret=JWT_SECRET
 *   npm run security:rotate-secrets -- --all
 */

import dotenv from 'dotenv'
dotenv.config()

import { secretsManager, validateRequiredSecrets } from '../../backend/config/secrets-manager'
import { logger } from '../../backend/utils/logging/logger'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

interface RotationResult {
  secretName: string
  success: boolean
  oldValue?: string
  newValue?: string
  error?: string
}

/**
 * Generate a cryptographically secure random secret
 */
function generateSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a JWT secret (256-bit recommended)
 */
function generateJWTSecret(): string {
  return generateSecret(32) // 32 bytes = 256 bits
}

/**
 * Generate an encryption key (256-bit)
 */
function generateEncryptionKey(): string {
  return generateSecret(32)
}

/**
 * Generate a session secret
 */
function generateSessionSecret(): string {
  return generateSecret(32)
}

/**
 * Rotate a single secret
 */
async function rotateSecret(secretName: string): Promise<RotationResult> {
  try {
    logger.info(`Rotating secret: ${secretName}`)

    // Get current value
    const oldValue = await secretsManager.getSecret(secretName)

    if (!oldValue) {
      return {
        secretName,
        success: false,
        error: 'Secret not found',
      }
    }

    // Generate new value based on secret type
    let newValue: string

    switch (secretName) {
      case 'JWT_SECRET':
        newValue = generateJWTSecret()
        break

      case 'ENCRYPTION_KEY':
        newValue = generateEncryptionKey()
        break

      case 'SESSION_SECRET':
        newValue = generateSessionSecret()
        break

      default:
        // For API keys and other secrets, generate a random 64-char string
        newValue = generateSecret(64)
        break
    }

    // Rotate the secret
    await secretsManager.rotateSecret(secretName, newValue)

    logger.info(`Successfully rotated secret: ${secretName}`)

    return {
      secretName,
      success: true,
      oldValue: maskSecret(oldValue),
      newValue: maskSecret(newValue),
    }
  } catch (error) {
    logger.error(`Failed to rotate secret: ${secretName}`, { error })

    return {
      secretName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Rotate all security-critical secrets
 */
async function rotateAllSecrets(): Promise<RotationResult[]> {
  const secretsToRotate = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'SENDGRID_API_KEY',
  ]

  logger.info('Starting rotation of all secrets', {
    count: secretsToRotate.length,
  })

  const results: RotationResult[] = []

  for (const secretName of secretsToRotate) {
    const result = await rotateSecret(secretName)
    results.push(result)

    // Wait 100ms between rotations to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}

/**
 * Mask secret for logging (show first 4 and last 4 chars)
 */
function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '********'
  }

  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`
}

/**
 * Save rotation results to audit log
 */
async function saveRotationAudit(results: RotationResult[]): Promise<void> {
  const auditLog = {
    timestamp: new Date().toISOString(),
    rotatedBy: process.env.USER || 'unknown',
    results: results.map((r) => ({
      secretName: r.secretName,
      success: r.success,
      oldValue: r.oldValue,
      newValue: r.newValue,
      error: r.error,
    })),
  }

  const auditDir = path.join(process.cwd(), 'logs', 'security')
  const auditFile = path.join(auditDir, `rotation-${Date.now()}.json`)

  try {
    // Create logs/security directory if it doesn't exist
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true })
    }

    fs.writeFileSync(auditFile, JSON.stringify(auditLog, null, 2))

    logger.info('Rotation audit log saved', { file: auditFile })
  } catch (error) {
    logger.error('Failed to save rotation audit log', { error })
  }
}

/**
 * Update .env file with new secrets (development only)
 */
async function updateEnvFile(results: RotationResult[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Skipping .env update in production (use AWS Secrets Manager instead)')
    return
  }

  const envPath = path.join(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    logger.warn('.env file not found - skipping update')
    return
  }

  try {
    let envContent = fs.readFileSync(envPath, 'utf8')

    for (const result of results) {
      if (result.success && result.newValue) {
        const secretName = result.secretName
        const newValue = await secretsManager.getSecret(secretName)

        if (newValue) {
          // Replace old value with new value in .env
          const regex = new RegExp(`^${secretName}=.*$`, 'm')

          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${secretName}=${newValue}`)
          } else {
            // Add new secret if not present
            envContent += `\n${secretName}=${newValue}`
          }
        }
      }
    }

    // Backup old .env
    const backupPath = `${envPath}.backup.${Date.now()}`
    fs.copyFileSync(envPath, backupPath)
    logger.info('.env backed up', { backup: backupPath })

    // Write updated .env
    fs.writeFileSync(envPath, envContent)
    logger.info('.env file updated with new secrets')
  } catch (error) {
    logger.error('Failed to update .env file', { error })
  }
}

/**
 * Main rotation function
 */
async function main() {
  const args = process.argv.slice(2)
  const rotateAll = args.includes('--all')
  const specificSecret = args.find((arg) => arg.startsWith('--secret='))?.split('=')[1]

  logger.info('Starting secret rotation', {
    rotateAll,
    specificSecret,
    environment: process.env.NODE_ENV,
  })

  let results: RotationResult[] = []

  if (specificSecret) {
    // Rotate a specific secret
    const result = await rotateSecret(specificSecret)
    results = [result]
  } else if (rotateAll) {
    // Rotate all secrets
    results = await rotateAllSecrets()
  } else {
    // Default: rotate JWT_SECRET only
    logger.info('No options specified - rotating JWT_SECRET only')
    const result = await rotateSecret('JWT_SECRET')
    results = [result]
  }

  // Print results
  console.log('\n========================================')
  console.log('SECRET ROTATION RESULTS')
  console.log('========================================\n')

  for (const result of results) {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED'
    console.log(`${status} - ${result.secretName}`)

    if (result.success) {
      console.log(`  Old: ${result.oldValue}`)
      console.log(`  New: ${result.newValue}`)
    } else {
      console.log(`  Error: ${result.error}`)
    }

    console.log()
  }

  // Save audit log
  await saveRotationAudit(results)

  // Update .env file (development only)
  if (process.env.NODE_ENV !== 'production') {
    await updateEnvFile(results)
  }

  // Summary
  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  console.log('========================================')
  console.log(`Total: ${results.length}`)
  console.log(`Success: ${successCount}`)
  console.log(`Failed: ${failureCount}`)
  console.log('========================================\n')

  if (failureCount > 0) {
    logger.error('Some secrets failed to rotate', { failureCount })
    process.exit(1)
  }

  logger.info('Secret rotation completed successfully')
  process.exit(0)
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Secret rotation failed', { error })
    process.exit(1)
  })
}

export { rotateSecret, rotateAllSecrets, generateSecret, generateJWTSecret }
