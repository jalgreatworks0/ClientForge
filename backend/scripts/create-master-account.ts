/**
 * Create Master Account Script
 * Creates the default tenant and master admin user
 */

import { getPool } from '../database/postgresql/pool'
import { hashPassword } from '../core/auth/password-service'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const MASTER_EMAIL = 'master@clientforge.io'
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || (() => { throw new Error("MASTER_PASSWORD environment variable is required. Please set it in .env file.") })()

async function createMasterAccount() {
  const pool = getPool()

  try {
    console.log('[SETUP] Creating master account...')

    // 1. Create default tenant
    const tenantId = DEFAULT_TENANT_ID
    await pool.query(
      `
      INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      `,
      [tenantId, 'Default Organization', 'default', 'active']
    )
    console.log('[OK] Default tenant created:', tenantId)

    // 2. Check if master user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [MASTER_EMAIL, tenantId]
    )

    if (existingUser.rows.length > 0) {
      console.log('[WARN] Master user already exists:', MASTER_EMAIL)
      console.log('User ID:', existingUser.rows[0].id)
      return
    }

    // 3. Create master user
    const userId = uuidv4()
    const passwordHash = await hashPassword(MASTER_PASSWORD)

    await pool.query(
      `
      INSERT INTO users (
        id, tenant_id, email, password_hash, username,
        first_name, last_name, role, status,
        email_verified, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `,
      [
        userId,
        tenantId,
        MASTER_EMAIL,
        passwordHash,
        'master',
        'Master',
        'Admin',
        'admin',
        'active',
        true, // email_verified
      ]
    )

    console.log('[OK] Master user created successfully!')
    console.log('===============================================')
    console.log('[EMAIL] Email:', MASTER_EMAIL)
    console.log('[KEY] Password:', MASTER_PASSWORD)
    console.log('[ORG] Tenant ID:', tenantId)
    console.log('[USER] User ID:', userId)
    console.log('===============================================')
  } catch (error) {
    console.error('[ERROR] Error creating master account:', error)
    throw error
  } finally {
    await pool.end()
  }
}

createMasterAccount()
  .then(() => {
    console.log('[OK] Master account setup complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[ERROR] Failed to create master account:', error)
    process.exit(1)
  })
