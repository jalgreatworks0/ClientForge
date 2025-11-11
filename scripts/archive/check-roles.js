/**
 * Check Roles in Database
 */

require('dotenv').config()
const { Pool } = require('pg')

// Try to connect - if DB_PASSWORD is not set, omit it (trust auth)
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'clientforge',
  user: process.env.DB_USER || 'postgres',
}

// Only add password if it's defined in env
if (process.env.DB_PASSWORD !== undefined) {
  poolConfig.password = process.env.DB_PASSWORD
}

const pool = new Pool(poolConfig)

async function checkRoles() {
  try {
    console.log('🔄 Connecting to PostgreSQL...')

    // Check roles
    const rolesResult = await pool.query(
      `SELECT id, name, description, tenant_id, created_at
       FROM roles
       ORDER BY name`
    )

    console.log('\n📋 Roles in database:')
    console.log('========================')
    if (rolesResult.rows.length === 0) {
      console.log('❌ No roles found!')
    } else {
      rolesResult.rows.forEach((role) => {
        console.log(`\nRole: ${role.name}`)
        console.log(`  ID: ${role.id}`)
        console.log(`  Tenant ID: ${role.tenant_id}`)
        console.log(`  Description: ${role.description || 'N/A'}`)
        console.log(`  Created: ${role.created_at}`)
      })
    }

    // Check users
    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.tenant_id, u.first_name, u.last_name, u.is_active, u.email_verified, ur.role_id, r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ORDER BY u.created_at DESC
       LIMIT 10`
    )

    console.log('\n\n👥 Users in database (last 10):')
    console.log('==================================')
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found!')
    } else {
      usersResult.rows.forEach((user) => {
        console.log(`\nUser: ${user.first_name} ${user.last_name} (${user.email})`)
        console.log(`  ID: ${user.id}`)
        console.log(`  Tenant ID: ${user.tenant_id}`)
        console.log(`  Role: ${user.role_name || 'NO ROLE ASSIGNED'} (${user.role_id || 'N/A'})`)
        console.log(`  Active: ${user.is_active}`)
        console.log(`  Email Verified: ${user.email_verified}`)
      })
    }

    await pool.end()
    console.log('\n✅ Done!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

checkRoles()
