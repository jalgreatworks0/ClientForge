/**
 * Complete Fix for Master Account and Login System
 * This script fixes all authentication issues in one go
 */

import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import { getPool } from '../database/postgresql/pool'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const DEFAULT_ROLE_ID = '00000000-0000-0000-0000-000000000002'
const MASTER_EMAIL = process.env.MASTER_EMAIL || 'master@clientforge.io'
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || '_puQRte2HNygbzbRZD2kNqiXIUBlrWAZ5lBKT3aIXPI'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function fixMasterAccountComplete() {
  const pool = getPool()

  try {
    console.log('='.repeat(60))
    console.log('🔧 CLIENTFORGE CRM - COMPLETE AUTH FIX')
    console.log('='.repeat(60))

    // Step 1: Create default tenant
    console.log('\n[1/5] Setting up default tenant...')
    await pool.query(
      `INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, 
           status = EXCLUDED.status,
           updated_at = NOW()`,
      [DEFAULT_TENANT_ID, 'Default Organization', 'default', 'active']
    )
    console.log('✅ Default tenant ready')

    // Step 2: Create admin role
    console.log('\n[2/5] Setting up admin role...')
    await pool.query(
      `INSERT INTO roles (id, name, description, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_ROLE_ID, 'admin', 'System Administrator']
    )
    console.log('✅ Admin role ready')

    // Step 3: Clean up existing master user
    console.log('\n[3/5] Cleaning up existing accounts...')
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [MASTER_EMAIL.toLowerCase()]
    )
    
    if (existingUser.rows.length > 0) {
      await pool.query(
        'DELETE FROM user_roles WHERE user_id = $1',
        [existingUser.rows[0].id]
      )
      await pool.query('DELETE FROM users WHERE id = $1', [existingUser.rows[0].id])
      console.log('✅ Cleaned up existing master account')
    } else {
      console.log('✅ No existing account to clean up')
    }

    // Step 4: Create new master user
    console.log('\n[4/5] Creating master account...')
    const userId = uuidv4()
    const passwordHash = await hashPassword(MASTER_PASSWORD)

    await pool.query(
      `INSERT INTO users (
        id, 
        tenant_id, 
        email, 
        password_hash,
        first_name, 
        last_name, 
        timezone, 
        locale,
        is_active,
        email_verified,
        failed_login_attempts,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [
        userId,
        DEFAULT_TENANT_ID,
        MASTER_EMAIL.toLowerCase(),
        passwordHash,
        'Master',
        'Admin',
        'UTC',
        'en',
        true,
        true,
        0
      ]
    )
    console.log('✅ Master user created')

    // Step 5: Assign admin role
    console.log('\n[5/5] Assigning admin role...')
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [userId, DEFAULT_ROLE_ID]
    )
    console.log('✅ Admin role assigned')

    // Verify the setup
    const verification = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.tenant_id,
        u.first_name,
        u.last_name,
        u.is_active,
        u.email_verified,
        ur.role_id,
        r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = $1`,
      [MASTER_EMAIL.toLowerCase()]
    )

    if (verification.rows.length === 0) {
      throw new Error('Verification failed - account not created properly')
    }

    const user = verification.rows[0]

    console.log('\n' + '='.repeat(60))
    console.log('🎉 MASTER ACCOUNT SETUP COMPLETE!')
    console.log('='.repeat(60))
    console.log('\n📋 ACCOUNT DETAILS:')
    console.log('─'.repeat(40))
    console.log('📧 Email:        ', MASTER_EMAIL)
    console.log('🔑 Password:     ', MASTER_PASSWORD)
    console.log('🏢 Tenant ID:    ', DEFAULT_TENANT_ID)
    console.log('👤 User ID:      ', userId)
    console.log('🛡️  Role:         ', user.role_name || 'admin')
    console.log('✅ Active:       ', user.is_active)
    console.log('✅ Verified:     ', user.email_verified)
    console.log('─'.repeat(40))
    console.log('\n🌐 LOGIN URLS:')
    console.log('Frontend:  http://localhost:3001')
    console.log('Backend:   http://localhost:3000/api/v1')
    console.log('─'.repeat(40))

    // Test login capability
    console.log('\n🧪 TESTING LOGIN CAPABILITY...')
    const testQuery = await pool.query(
      `SELECT 
        u.password_hash,
        u.is_active,
        u.email_verified,
        u.failed_login_attempts,
        u.locked_until
       FROM users u
       WHERE LOWER(u.email) = LOWER($1)
         AND u.tenant_id = $2
         AND u.deleted_at IS NULL`,
      [MASTER_EMAIL, DEFAULT_TENANT_ID]
    )

    if (testQuery.rows.length > 0) {
      const testUser = testQuery.rows[0]
      const passwordValid = await bcrypt.compare(MASTER_PASSWORD, testUser.password_hash)
      
      console.log('✅ User found in database')
      console.log('✅ Password hash valid:', passwordValid)
      console.log('✅ Account active:', testUser.is_active)
      console.log('✅ Email verified:', testUser.email_verified)
      console.log('✅ Not locked:', !testUser.locked_until)
      
      if (passwordValid && testUser.is_active) {
        console.log('\n🎉 LOGIN TEST PASSED - Account is ready!')
      } else {
        console.log('\n⚠️  WARNING: Account exists but may have login issues')
      }
    } else {
      console.log('\n❌ ERROR: User not found with tenant query')
    }

    console.log('\n' + '='.repeat(60))
    console.log('📝 CURL TEST COMMAND:')
    console.log('─'.repeat(40))
    console.log(`curl -X POST http://localhost:3000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${MASTER_EMAIL}",
    "password": "${MASTER_PASSWORD}",
    "tenantId": "${DEFAULT_TENANT_ID}"
  }'`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ SETUP FAILED:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the script
if (require.main === module) {
  fixMasterAccountComplete()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

export { fixMasterAccountComplete }
