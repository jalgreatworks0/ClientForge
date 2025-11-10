/**
 * Secrets Manager Configuration
 * Secure secret management using environment-based strategy
 *
 * Production: Use AWS Secrets Manager
 * Development: Use encrypted .env files
 */

import crypto from 'crypto'

import { logger } from '../utils/logging/logger'

export interface Secret {
  name: string
  value: string
  lastRotated?: Date
  version?: number
}

export interface SecretsManagerConfig {
  provider: 'env' | 'aws-secrets-manager' | 'hashicorp-vault'
  encryptionKey?: string
  awsRegion?: string
  awsSecretName?: string
  vaultUrl?: string
  vaultToken?: string
}

/**
 * Abstract Secrets Manager Interface
 */
export abstract class SecretsManager {
  abstract getSecret(name: string): Promise<string | null>
  abstract setSecret(name: string, value: string): Promise<void>
  abstract rotateSecret(name: string, newValue: string): Promise<void>
  abstract deleteSecret(name: string): Promise<void>
  abstract listSecrets(): Promise<string[]>
}

/**
 * Environment-based Secrets Manager (Development)
 * Uses encrypted environment variables
 */
export class EnvSecretsManager extends SecretsManager {
  private encryptionKey: string

  constructor(config: SecretsManagerConfig) {
    super()
    // Use provided encryption key or generate from environment
    this.encryptionKey = config.encryptionKey || process.env.ENCRYPTION_KEY || this.generateKey()

    if (!process.env.ENCRYPTION_KEY) {
      logger.warn('No ENCRYPTION_KEY set - using generated key (secrets will not persist across restarts)')
    }
  }

  async getSecret(name: string): Promise<string | null> {
    try {
      const envValue = process.env[name]

      if (!envValue) {
        logger.debug('Secret not found in environment', { name })
        return null
      }

      // Check if value is encrypted (starts with 'enc:')
      if (envValue.startsWith('enc:')) {
        return this.decrypt(envValue.substring(4))
      }

      return envValue
    } catch (error) {
      logger.error('Failed to get secret', { name, error })
      return null
    }
  }

  async setSecret(name: string, value: string): Promise<void> {
    try {
      // Store encrypted value in process.env (runtime only)
      const encrypted = `enc:${this.encrypt(value)}`
      process.env[name] = encrypted

      logger.info('Secret set successfully', { name })
    } catch (error) {
      logger.error('Failed to set secret', { name, error })
      throw new Error(`Failed to set secret: ${name}`)
    }
  }

  async rotateSecret(name: string, newValue: string): Promise<void> {
    try {
      const oldValue = await this.getSecret(name)

      if (!oldValue) {
        throw new Error(`Secret not found: ${name}`)
      }

      // Set new value
      await this.setSecret(name, newValue)

      logger.info('Secret rotated successfully', {
        name,
        rotatedAt: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Failed to rotate secret', { name, error })
      throw new Error(`Failed to rotate secret: ${name}`)
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      delete process.env[name]
      logger.info('Secret deleted', { name })
    } catch (error) {
      logger.error('Failed to delete secret', { name, error })
      throw new Error(`Failed to delete secret: ${name}`)
    }
  }

  async listSecrets(): Promise<string[]> {
    // Return common secret names from environment
    const secretKeys = Object.keys(process.env).filter(
      (key) =>
        key.includes('SECRET') ||
        key.includes('KEY') ||
        key.includes('TOKEN') ||
        key.includes('PASSWORD') ||
        key.includes('API_KEY')
    )
    return secretKeys
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16)
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      // Return: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    } catch (error) {
      logger.error('Encryption failed', { error })
      throw new Error('Failed to encrypt secret')
    }
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':')

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      logger.error('Decryption failed', { error })
      throw new Error('Failed to decrypt secret')
    }
  }

  /**
   * Generate a random encryption key
   */
  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}

/**
 * AWS Secrets Manager (Production)
 * Requires AWS SDK and proper IAM permissions
 */
export class AWSSecretsManager extends SecretsManager {
  private region: string
  private secretName: string

  constructor(config: SecretsManagerConfig) {
    super()
    this.region = config.awsRegion || process.env.AWS_REGION || 'us-east-1'
    this.secretName = config.awsSecretName || 'clientforge-crm-secrets'

    logger.info('AWS Secrets Manager initialized', {
      region: this.region,
      secretName: this.secretName,
    })
  }

  async getSecret(name: string): Promise<string | null> {
    logger.warn('AWS Secrets Manager not implemented - install @aws-sdk/client-secrets-manager')
    // TODO: Implement AWS SDK integration
    // const client = new SecretsManagerClient({ region: this.region })
    // const command = new GetSecretValueCommand({ SecretId: `${this.secretName}/${name}` })
    // const response = await client.send(command)
    // return response.SecretString || null
    return process.env[name] || null
  }

  async setSecret(name: string, value: string): Promise<void> {
    logger.warn('AWS Secrets Manager not implemented - using fallback to env')
    process.env[name] = value
  }

  async rotateSecret(name: string, newValue: string): Promise<void> {
    logger.warn('AWS Secrets Manager rotation not implemented')
    await this.setSecret(name, newValue)
  }

  async deleteSecret(name: string): Promise<void> {
    logger.warn('AWS Secrets Manager delete not implemented')
    delete process.env[name]
  }

  async listSecrets(): Promise<string[]> {
    logger.warn('AWS Secrets Manager list not implemented')
    return []
  }
}

/**
 * Create and configure secrets manager based on environment
 */
export function createSecretsManager(config?: Partial<SecretsManagerConfig>): SecretsManager {
  const provider = config?.provider || process.env.SECRETS_PROVIDER || 'env'

  const fullConfig: SecretsManagerConfig = {
    provider: provider as any,
    encryptionKey: config?.encryptionKey || process.env.ENCRYPTION_KEY,
    awsRegion: config?.awsRegion || process.env.AWS_REGION,
    awsSecretName: config?.awsSecretName || process.env.AWS_SECRET_NAME,
    vaultUrl: config?.vaultUrl || process.env.VAULT_URL,
    vaultToken: config?.vaultToken || process.env.VAULT_TOKEN,
  }

  logger.info('Creating secrets manager', {
    provider: fullConfig.provider,
    environment: process.env.NODE_ENV,
  })

  switch (fullConfig.provider) {
    case 'aws-secrets-manager':
      return new AWSSecretsManager(fullConfig)

    case 'hashicorp-vault':
      logger.warn('HashiCorp Vault not implemented - falling back to env')
      return new EnvSecretsManager(fullConfig)

    case 'env':
    default:
      return new EnvSecretsManager(fullConfig)
  }
}

// Export singleton instance
export const secretsManager = createSecretsManager()

/**
 * Utility function to safely get secrets with fallback
 */
export async function getSecretOrEnv(name: string, fallback?: string): Promise<string> {
  try {
    const secret = await secretsManager.getSecret(name)

    if (secret) {
      return secret
    }

    if (fallback !== undefined) {
      logger.debug('Using fallback for secret', { name })
      return fallback
    }

    throw new Error(`Secret not found: ${name}`)
  } catch (error) {
    logger.error('Failed to get secret with fallback', { name, error })

    if (fallback !== undefined) {
      return fallback
    }

    throw error
  }
}

/**
 * Validate that all required secrets are present
 */
export async function validateRequiredSecrets(requiredSecrets: string[]): Promise<boolean> {
  const missing: string[] = []

  for (const secretName of requiredSecrets) {
    const value = await secretsManager.getSecret(secretName)

    if (!value) {
      missing.push(secretName)
    }
  }

  if (missing.length > 0) {
    logger.error('Missing required secrets', { missing })
    return false
  }

  logger.info('All required secrets are present', {
    count: requiredSecrets.length,
  })

  return true
}
