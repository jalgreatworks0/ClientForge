/**
 * Email Integration Database Schema Setup
 * Creates tables for email accounts and email messages
 * Supports Gmail and Outlook integrations
 */

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'clientforge',
  user: process.env.DB_USER || 'crm',
  password: process.env.DB_PASSWORD || 'password',
})

async function setupEmailSchema() {
  const client = await pool.connect()

  try {
    console.log('[INFO] Starting email integration schema setup...')

    // 1. Create email_accounts table
    console.log('[STEP 1] Creating email_accounts table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL CHECK (provider IN ('gmail', 'outlook')),
        email VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        sync_enabled BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,

        -- Unique constraint: one account per user/provider/email combination
        CONSTRAINT unique_email_account UNIQUE (user_id, provider, email)
      )
    `)
    console.log('✅ email_accounts table created')

    // 2. Create email_messages table
    console.log('[STEP 2] Creating email_messages table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        message_id VARCHAR(255) NOT NULL,
        thread_id VARCHAR(255),
        from_name VARCHAR(255),
        from_email VARCHAR(255) NOT NULL,
        to_addresses JSONB NOT NULL DEFAULT '[]',
        cc_addresses JSONB DEFAULT '[]',
        bcc_addresses JSONB DEFAULT '[]',
        subject TEXT,
        body_text TEXT,
        body_html TEXT,
        received_at TIMESTAMP WITH TIME ZONE NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        is_read BOOLEAN DEFAULT false,
        has_attachments BOOLEAN DEFAULT false,
        labels TEXT[] DEFAULT '{}',
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        -- Unique constraint: one message per account/message_id
        CONSTRAINT unique_email_message UNIQUE (account_id, message_id)
      )
    `)
    console.log('✅ email_messages table created')

    // 3. Create indexes for email_accounts
    console.log('[STEP 3] Creating indexes for email_accounts...')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id
        ON email_accounts(user_id)
        WHERE deleted_at IS NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_tenant_id
        ON email_accounts(tenant_id)
        WHERE deleted_at IS NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_email
        ON email_accounts(email)
        WHERE deleted_at IS NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_active_sync
        ON email_accounts(user_id, is_active, sync_enabled)
        WHERE deleted_at IS NULL AND is_active = true AND sync_enabled = true
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_expires_at
        ON email_accounts(expires_at)
        WHERE deleted_at IS NULL AND is_active = true
    `)

    console.log('✅ email_accounts indexes created (5 indexes)')

    // 4. Create indexes for email_messages
    console.log('[STEP 4] Creating indexes for email_messages...')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_account_id
        ON email_messages(account_id)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_tenant_id
        ON email_messages(tenant_id)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_contact_id
        ON email_messages(contact_id)
        WHERE contact_id IS NOT NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_deal_id
        ON email_messages(deal_id)
        WHERE deal_id IS NOT NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_from_email
        ON email_messages(from_email)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_received_at
        ON email_messages(received_at DESC)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id
        ON email_messages(thread_id)
        WHERE thread_id IS NOT NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_is_read
        ON email_messages(account_id, is_read, received_at DESC)
        WHERE is_read = false
    `)

    // GIN index for labels array
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_labels
        ON email_messages USING gin(labels)
    `)

    // Full-text search on subject and body
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_messages_search
        ON email_messages USING gin(
          to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_text, ''))
        )
    `)

    console.log('✅ email_messages indexes created (10 indexes)')

    // 5. Create trigger for updated_at on email_accounts
    console.log('[STEP 5] Creating triggers...')

    await client.query(`
      CREATE OR REPLACE FUNCTION update_email_accounts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_email_accounts_updated_at ON email_accounts
    `)

    await client.query(`
      CREATE TRIGGER trigger_update_email_accounts_updated_at
        BEFORE UPDATE ON email_accounts
        FOR EACH ROW
        EXECUTE FUNCTION update_email_accounts_updated_at()
    `)

    // Trigger for email_messages
    await client.query(`
      CREATE OR REPLACE FUNCTION update_email_messages_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_email_messages_updated_at ON email_messages
    `)

    await client.query(`
      CREATE TRIGGER trigger_update_email_messages_updated_at
        BEFORE UPDATE ON email_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_email_messages_updated_at()
    `)

    console.log('✅ Triggers created for updated_at fields')

    // 6. Verify tables and indexes
    console.log('[STEP 6] Verifying schema setup...')

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('email_accounts', 'email_messages')
      ORDER BY table_name
    `)

    console.log(`✅ Tables verified: ${tablesResult.rows.map(r => r.table_name).join(', ')}`)

    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('email_accounts', 'email_messages')
      ORDER BY indexname
    `)

    console.log(`✅ Indexes verified: ${indexesResult.rowCount} indexes created`)

    console.log('\n🎉 Email integration schema setup complete!')
    console.log('\nNext steps:')
    console.log('1. Create email API routes (/api/v1/email/*)')
    console.log('2. Build email UI components (settings, viewer, composer)')
    console.log('3. Set up background sync job with BullMQ')

  } catch (error) {
    console.error('❌ Error setting up email schema:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
if (require.main === module) {
  setupEmailSchema()
    .then(() => {
      console.log('\n✅ Migration completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message)
      process.exit(1)
    })
}

module.exports = { setupEmailSchema }
