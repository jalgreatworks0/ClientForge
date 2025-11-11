#!/usr/bin/env tsx
/**
 * Seed Master Admin User
 * Creates or updates the master admin account for initial system access
 *
 * Usage:
 *   npm run seed:admin
 *   MASTER_EMAIL=custom@domain.com MASTER_PASSWORD=SecurePass123 npm run seed:admin
 *
 * Environment Variables:
 *   MASTER_EMAIL (default: admin@clientforge.local)
 *   MASTER_PASSWORD (default: Admin!234)
 *   DATABASE_URL (required)
 */

import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'

dotenv.config()

const BCRYPT_COST = 12 // Production-grade cost factor

interface SeedConfig {
  email: string
  password: string
  databaseUrl: string
}

async function seedMasterAdmin(): Promise<void> {
  const config: SeedConfig = {
    email: process.env.MASTER_EMAIL || 'admin@clientforge.local',
    password: process.env.MASTER_PASSWORD || 'Admin!234',
    databaseUrl: process.env.DATABASE_URL || '',
  }

  // Validate configuration
  if (!config.databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  if (config.password.length < 8) {
    console.error('❌ MASTER_PASSWORD must be at least 8 characters long')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: config.databaseUrl })

  try {
    console.log('\n════════════════════════════════════════════════')
    console.log('  Seeding Master Admin User')
    console.log('════════════════════════════════════════════════\n')

    // Hash the password with bcrypt
    console.log('⏳ Hashing password (bcrypt cost: 12)...')
    const passwordHash = await bcrypt.hash(config.password, BCRYPT_COST)
    console.log('✅ Password hashed successfully\n')

    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Users table does not exist. Please run migrations first:')
      console.error('   npm run db:migrate\n')
      process.exit(1)
    }

    // Ensure default tenant exists
    console.log(`⏳ Checking for default tenant...`)
    const tenantResult = await pool.query(`
      INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Default Organization',
        'default',
        NOW(),
        NOW()
      )
      ON CONFLICT (subdomain) DO UPDATE SET subdomain = EXCLUDED.subdomain
      RETURNING id
    `)
    const tenantId = tenantResult.rows[0].id
    console.log(`✅ Default tenant ID: ${tenantId}`)

    // Ensure owner role exists
    console.log(`⏳ Checking for owner role...`)
    const roleResult = await pool.query(`
      INSERT INTO roles (id, tenant_id, name, description, permissions, is_system, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        $1,
        'Owner',
        'System owner with full permissions',
        '["admin", "manage_users", "manage_roles", "manage_all"]'::jsonb,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [tenantId])
    const roleId = roleResult.rows[0].id
    console.log(`✅ Owner role ID: ${roleId}\n`)

    // Insert or update master admin user
    console.log(`⏳ Creating/updating admin user: ${config.email}...`)

    const result = await pool.query(
      `
      INSERT INTO users (
        id,
        tenant_id,
        email,
        password_hash,
        first_name,
        last_name,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        'Master',
        'Admin',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_active = true,
        updated_at = NOW()
      RETURNING id, email, first_name, last_name, is_active
      `,
      [tenantId, config.email, passwordHash]
    )

    const user = result.rows[0]

    // Assign owner role to user via user_roles junction table
    console.log(`⏳ Assigning owner role to user...`)
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id, assigned_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [user.id, roleId])
    console.log(`✅ Role assigned successfully`)

    console.log('\n════════════════════════════════════════════════')
    console.log('✅ Master admin seeded successfully!')
    console.log('════════════════════════════════════════════════\n')
    console.log('📋 Admin User Details:')
    console.log(`   Email:    ${user.email}`)
    console.log(`   Password: ${config.password}`)
    console.log(`   Name:     ${user.first_name} ${user.last_name}`)
    console.log(`   Active:   ${user.is_active}`)
    console.log(`   User ID:  ${user.id}`)
    console.log('\n⚠️  IMPORTANT: Change this password in production!\n')
    console.log('You can now log in to ClientForge CRM with these credentials.')
    console.log('════════════════════════════════════════════════\n')

  } catch (error: any) {
    console.error('\n❌ Failed to seed master admin:')
    console.error(`   ${error.message}\n`)

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Database connection refused. Is PostgreSQL running?')
      console.error('   Check your DATABASE_URL and ensure PostgreSQL is accessible.\n')
    } else if (error.code === '42P01') {
      console.error('💡 Users table not found. Run migrations first:')
      console.error('   npm run db:migrate\n')
    } else if (error.code === '23505') {
      console.error('💡 Duplicate key error. This should not happen with ON CONFLICT.')
      console.error('   Check your database schema.\n')
    }

    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the seed
seedMasterAdmin().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
