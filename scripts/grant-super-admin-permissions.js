/**
 * Grant Super Admin Full Permissions
 * Gives the Super Admin role access to all endpoints including analytics
 */

require('dotenv').config()
const { Pool } = require('pg')

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'clientforge',
  user: process.env.DB_USER || 'postgres',
}

if (process.env.DB_PASSWORD !== undefined) {
  poolConfig.password = process.env.DB_PASSWORD
}

const pool = new Pool(poolConfig)

// Permissions needed for analytics
const permissions = [
  'analytics:read',
  'analytics:dashboard',
  'analytics:deals',
  'analytics:tasks',
  'analytics:activities',
  'contacts:read',
  'contacts:write',
  'deals:read',
  'deals:write',
  'tasks:read',
  'tasks:write',
  'users:read',
  'users:write',
  'roles:read',
  'roles:write',
  'settings:read',
  'settings:write',
]

async function grantPermissions() {
  const client = await pool.connect()

  try {
    console.log('🔄 Connecting to PostgreSQL...')
    await client.query('BEGIN')

    // Check if permissions table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'permissions'
      );
    `)

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Permissions table does not exist')
      console.log('ℹ️  This system may not use role-based permissions')
      await client.query('ROLLBACK')
      return
    }

    // Find Super Admin role
    const roleResult = await client.query(
      `SELECT id, name FROM roles WHERE name = 'Super Admin' OR name = 'Administrator' ORDER BY name LIMIT 1`
    )

    if (roleResult.rows.length === 0) {
      console.log('❌ No Super Admin or Administrator role found')
      await client.query('ROLLBACK')
      return
    }

    const role = roleResult.rows[0]
    console.log(`\n✅ Found role: ${role.name} (${role.id})`)

    // Create or update permissions
    console.log('\n📝 Creating permissions...')
    for (const permission of permissions) {
      try {
        const result = await client.query(
          `INSERT INTO permissions (name, description, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [permission, `Permission for ${permission}`]
        )

        if (result.rows.length > 0) {
          console.log(`  ✅ Created: ${permission}`)
        } else {
          console.log(`  ℹ️  Already exists: ${permission}`)
        }
      } catch (err) {
        console.log(`  ⚠️  Error with ${permission}: ${err.message}`)
      }
    }

    // Grant all permissions to the role
    console.log(`\n🔐 Granting permissions to ${role.name}...`)

    // Check if role_permissions table exists
    const rolePermTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'role_permissions'
      );
    `)

    if (rolePermTableCheck.rows[0].exists) {
      for (const permission of permissions) {
        try {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             SELECT $1, id FROM permissions WHERE name = $2
             ON CONFLICT DO NOTHING`,
            [role.id, permission]
          )
          console.log(`  ✅ Granted: ${permission}`)
        } catch (err) {
          console.log(`  ⚠️  Error granting ${permission}: ${err.message}`)
        }
      }
    } else {
      console.log('ℹ️  role_permissions table does not exist')
      console.log('ℹ️  Trying alternative: Update role with permissions array')

      // Try updating role with permissions array (if schema uses JSONB)
      try {
        await client.query(
          `UPDATE roles
           SET permissions = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(permissions), role.id]
        )
        console.log('  ✅ Updated role permissions array')
      } catch (err) {
        console.log(`  ⚠️  Could not update permissions: ${err.message}`)
      }
    }

    await client.query('COMMIT')

    console.log('\n✅ Done! Super Admin now has full analytics access')
    console.log('\nℹ️  You may need to:')
    console.log('   1. Restart the backend server')
    console.log('   2. Log out and log back in')
    console.log('   3. Refresh the browser')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    client.release()
    await pool.end()
  }
}

grantPermissions()
