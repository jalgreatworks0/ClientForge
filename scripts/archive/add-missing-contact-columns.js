/**
 * Add missing columns to contacts table
 * Adds: lifecycle_stage, tags, last_contacted_at, deleted_at
 */

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://crm:password@localhost:5432/clientforge',
})

async function addMissingColumns() {
  const client = await pool.connect()

  try {
    console.log('🔄 Adding missing columns to contacts table...\n')

    // 1. Add lifecycle_stage column
    await client.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) DEFAULT 'lead'
    `)
    console.log('✅ Added lifecycle_stage column')

    // 2. Add tags column (array of text)
    await client.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
    `)
    console.log('✅ Added tags column')

    // 3. Add last_contacted_at column
    await client.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP
    `)
    console.log('✅ Added last_contacted_at column')

    // 4. Add deleted_at column for soft deletes
    await client.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `)
    console.log('✅ Added deleted_at column')

    // 5. Create index on deleted_at for faster queries
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_deleted_at
      ON contacts(deleted_at)
    `)
    console.log('✅ Added index on deleted_at')

    // 6. Create index on lifecycle_stage for filtering
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_lifecycle_stage
      ON contacts(lifecycle_stage)
      WHERE deleted_at IS NULL
    `)
    console.log('✅ Added index on lifecycle_stage')

    // 7. Create GIN index on tags for fast array searches
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_tags
      ON contacts USING gin(tags)
    `)
    console.log('✅ Added GIN index on tags')

    console.log('\n✅ All missing columns added successfully!')
    console.log('\nNew columns:')
    console.log('  - lifecycle_stage: VARCHAR(50) DEFAULT \'lead\'')
    console.log('  - tags: TEXT[] DEFAULT \'{}\'')
    console.log('  - last_contacted_at: TIMESTAMP')
    console.log('  - deleted_at: TIMESTAMP')

  } catch (error) {
    console.error('❌ Error adding columns:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

addMissingColumns()
  .then(() => {
    console.log('\n✅ Migration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
