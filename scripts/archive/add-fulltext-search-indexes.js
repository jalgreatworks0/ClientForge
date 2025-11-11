/**
 * Add Full-Text Search Indexes
 * PostgreSQL full-text search with tsvector and GIN indexes
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

async function addFullTextSearchIndexes() {
  const client = await pool.connect()

  try {
    console.log('🔄 Setting up full-text search indexes...\n')

    // 1. Enable pg_trgm extension for fuzzy matching
    console.log('📦 Enabling pg_trgm extension...')
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
      console.log('   ✅ pg_trgm extension enabled\n')
    } catch (error) {
      console.log(`   ℹ️  Extension already exists or no permissions\n`)
    }

    // 2. Add tsvector column to contacts if not exists
    console.log('📊 Adding search_vector column to contacts...')
    try {
      await client.query(`
        ALTER TABLE contacts
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(first_name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(last_name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(email, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(phone, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(title, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(notes, '')), 'D')
        ) STORED
      `)
      console.log('   ✅ search_vector column added\n')
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('   ℹ️  Column already exists\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 3. Create GIN index on contacts search_vector
    console.log('📊 Creating GIN index on contacts.search_vector...')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_search_vector
        ON contacts USING gin(search_vector)
      `)
      console.log('   ✅ GIN index created\n')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Index already exists\n')
      } else if (error.message.includes('does not exist')) {
        console.log('   ⚠️  search_vector column not available, skipping\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 4. Create trigram index for fuzzy name matching
    console.log('📊 Creating trigram index on contacts name...')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_name_trgm
        ON contacts USING gin((first_name || ' ' || last_name) gin_trgm_ops)
      `)
      console.log('   ✅ Trigram index created\n')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Index already exists\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 5. Create trigram index for email fuzzy matching
    console.log('📊 Creating trigram index on contacts email...')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_email_trgm
        ON contacts USING gin(email gin_trgm_ops)
      `)
      console.log('   ✅ Email trigram index created\n')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Index already exists\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 6. Add search_vector to accounts
    console.log('📊 Adding search_vector column to accounts...')
    try {
      await client.query(`
        ALTER TABLE accounts
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(website, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(industry, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'D')
        ) STORED
      `)
      console.log('   ✅ search_vector column added\n')
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('   ℹ️  Column already exists\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 7. Create GIN index on accounts search_vector
    console.log('📊 Creating GIN index on accounts.search_vector...')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_search_vector
        ON accounts USING gin(search_vector)
      `)
      console.log('   ✅ GIN index created\n')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Index already exists\n')
      } else if (error.message.includes('does not exist')) {
        console.log('   ⚠️  search_vector column not available, skipping\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 8. Add search_vector to deals
    console.log('📊 Adding search_vector column to deals...')
    try {
      await client.query(`
        ALTER TABLE deals
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'C')
        ) STORED
      `)
      console.log('   ✅ search_vector column added\n')
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('   ℹ️  Column already exists\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    // 9. Create GIN index on deals search_vector
    console.log('📊 Creating GIN index on deals.search_vector...')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_search_vector
        ON deals USING gin(search_vector)
      `)
      console.log('   ✅ GIN index created\n')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Index already exists\n')
      } else if (error.message.includes('does not exist')) {
        console.log('   ⚠️  search_vector column not available, skipping\n')
      } else {
        console.log(`   ⚠️  ${error.message}\n`)
      }
    }

    console.log('═'.repeat(60))
    console.log('✅ Full-text search setup complete!')
    console.log('═'.repeat(60))
    console.log('\n📖 Usage examples:\n')
    console.log('-- Search contacts by name (full-text):')
    console.log("SELECT * FROM contacts WHERE search_vector @@ to_tsquery('english', 'john & doe');\n")
    console.log('-- Search contacts by name (fuzzy):')
    console.log("SELECT * FROM contacts WHERE (first_name || ' ' || last_name) % 'Jon Doe' ORDER BY similarity((first_name || ' ' || last_name), 'Jon Doe') DESC LIMIT 10;\n")
    console.log('-- Search contacts by email (fuzzy):')
    console.log("SELECT * FROM contacts WHERE email % 'johndoe@example.com' ORDER BY similarity(email, 'johndoe@example.com') DESC LIMIT 10;\n")

  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addFullTextSearchIndexes()
