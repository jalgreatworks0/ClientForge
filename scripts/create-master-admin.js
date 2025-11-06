/**
 * Create Master Admin Account
 * Creates a master admin account with email: Master@clientforge.io
 * Password: Admin123
 */

require('dotenv').config()
const bcrypt = require('bcrypt')
const { Pool } = require('pg')
const crypto = require('crypto')

// Parse DATABASE_URL or use individual env vars
let poolConfig
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'clientforge',
    user: process.env.DB_USER || 'crm',
    password: process.env.DB_PASSWORD || 'password',
  }
}

const pool = new Pool(poolConfig)

// Generate UUID (compatible with older Node.js)
function generateUUID() {
  return crypto.randomUUID()
}

async function createMasterAdmin() {
  const client = await pool.connect()

  try {
    console.log('🔧 Creating master admin account...')

    // Start transaction
    await client.query('BEGIN')

    // 1. Create or get master tenant
    const tenantId = generateUUID()
    const tenantResult = await client.query(
      `INSERT INTO tenants (id, name, subdomain, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (subdomain) DO UPDATE SET name = $2
       RETURNING id`,
      [tenantId, 'ClientForge Master', 'master', true]
    )

    const finalTenantId = tenantResult.rows[0].id
    console.log(`✅ Tenant created/updated: ${finalTenantId}`)

    // 2. Create or get Admin role
    const roleResult = await client.query(
      `INSERT INTO roles (id, tenant_id, name, description, permissions, is_system_role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (tenant_id, name) DO UPDATE SET permissions = $5
       RETURNING id`,
      [
        generateUUID(),
        finalTenantId,
        'Super Admin',
        'Master administrator with full system access',
        JSON.stringify(['*']), // All permissions
        true,
      ]
    )

    const roleId = roleResult.rows[0].id
    console.log(`✅ Role created/updated: ${roleId}`)

    // 3. Hash password
    const passwordHash = await bcrypt.hash('Admin123', 10)

    // 4. Create or update master user
    const userId = generateUUID()
    const email = 'master@clientforge.io'

    const userResult = await client.query(
      `INSERT INTO users (
        id, tenant_id, role_id, email, password_hash,
        first_name, last_name, is_active, is_email_verified,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (tenant_id, email)
      DO UPDATE SET
        password_hash = $5,
        is_active = $8,
        updated_at = NOW()
      RETURNING id, email`,
      [
        userId,
        finalTenantId,
        roleId,
        email.toLowerCase(),
        passwordHash,
        'Master',
        'Admin',
        true,
        true,
      ]
    )

    const finalUser = userResult.rows[0]

    // Commit transaction
    await client.query('COMMIT')

    console.log('\n✅ Master admin account created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:    Master@clientforge.io')
    console.log('🔑 Password: Admin123')
    console.log('🆔 User ID:  ' + finalUser.id)
    console.log('🏢 Tenant:   ' + finalTenantId)
    console.log('👤 Role:     ' + roleId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n⚠️  IMPORTANT: Change this password after first login!')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error creating master admin:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the script
createMasterAdmin()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
