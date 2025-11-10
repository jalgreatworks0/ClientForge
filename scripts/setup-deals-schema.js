/**
 * Setup Deals Schema
 * Creates pipelines, deal_stages tables and updates deals table
 * Also seeds a default pipeline with standard sales stages
 */

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://crm:password@localhost:5432/clientforge',
})

async function setupDealsSchema() {
  const client = await pool.connect()

  try {
    console.log('🔄 Setting up Deals schema...\n')

    // ============================================================
    // 1. CREATE PIPELINES TABLE
    // ============================================================
    console.log('📋 Creating pipelines table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `)
    console.log('✅ Pipelines table created')

    // Create indexes for pipelines
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pipelines_is_default ON pipelines(tenant_id, is_default) WHERE deleted_at IS NULL AND is_default = true
    `)
    console.log('✅ Pipelines indexes created')

    // ============================================================
    // 2. CREATE DEAL_STAGES TABLE
    // ============================================================
    console.log('\n📋 Creating deal_stages table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_stages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        display_order INTEGER NOT NULL,
        probability INTEGER NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
        is_closed_stage BOOLEAN DEFAULT false,
        is_won_stage BOOLEAN DEFAULT false,
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `)
    console.log('✅ Deal stages table created')

    // Create indexes for deal_stages
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_stages_pipeline_id ON deal_stages(pipeline_id) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_stages_tenant_id ON deal_stages(tenant_id) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_stages_display_order ON deal_stages(pipeline_id, display_order) WHERE deleted_at IS NULL
    `)
    console.log('✅ Deal stages indexes created')

    // ============================================================
    // 3. CREATE DEAL_STAGE_HISTORY TABLE
    // ============================================================
    console.log('\n📋 Creating deal_stage_history table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_stage_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        from_stage_id UUID REFERENCES deal_stages(id),
        to_stage_id UUID NOT NULL REFERENCES deal_stages(id),
        changed_by UUID NOT NULL REFERENCES users(id),
        duration_days INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Deal stage history table created')

    // Create indexes for deal_stage_history
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal_id ON deal_stage_history(deal_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_stage_history_tenant_id ON deal_stage_history(tenant_id)
    `)
    console.log('✅ Deal stage history indexes created')

    // ============================================================
    // 4. UPDATE DEALS TABLE - ADD MISSING COLUMNS
    // ============================================================
    console.log('\n📋 Updating deals table with missing columns...')

    // Add pipeline_id column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id)
    `)
    console.log('✅ Added pipeline_id column')

    // Add stage_id column (will replace old 'stage' column)
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES deal_stages(id)
    `)
    console.log('✅ Added stage_id column')

    // Add contact_id column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id)
    `)
    console.log('✅ Added contact_id column')

    // Add currency column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'
    `)
    console.log('✅ Added currency column')

    // Add tags array column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
    `)
    console.log('✅ Added tags column')

    // Add is_closed column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false
    `)
    console.log('✅ Added is_closed column')

    // Add deleted_at column for soft deletes
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `)
    console.log('✅ Added deleted_at column')

    // Add weighted_amount column (amount * probability)
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS weighted_amount NUMERIC
    `)
    console.log('✅ Added weighted_amount column')

    // Add days_in_stage column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS days_in_stage INTEGER DEFAULT 0
    `)
    console.log('✅ Added days_in_stage column')

    // Add last_stage_change_at column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_stage_change_at TIMESTAMP
    `)
    console.log('✅ Added last_stage_change_at column')

    // Add competitors array column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS competitors TEXT[] DEFAULT '{}'
    `)
    console.log('✅ Added competitors column')

    // Add decision_makers array column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS decision_makers TEXT[] DEFAULT '{}'
    `)
    console.log('✅ Added decision_makers column')

    // Add key_contacts array column
    await client.query(`
      ALTER TABLE deals ADD COLUMN IF NOT EXISTS key_contacts TEXT[] DEFAULT '{}'
    `)
    console.log('✅ Added key_contacts column')

    // ============================================================
    // 5. CREATE INDEXES ON DEALS TABLE
    // ============================================================
    console.log('\n📋 Creating additional indexes on deals table...')

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_is_closed ON deals(is_closed) WHERE deleted_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(deleted_at)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_tags ON deals USING gin(tags)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date) WHERE deleted_at IS NULL
    `)
    console.log('✅ Deal indexes created')

    // ============================================================
    // 6. SEED DEFAULT PIPELINE AND STAGES
    // ============================================================
    console.log('\n📋 Seeding default pipeline and stages...')

    // Get the first tenant (or you can specify a specific tenant_id)
    const tenantResult = await client.query(`
      SELECT id FROM tenants LIMIT 1
    `)

    if (tenantResult.rows.length === 0) {
      console.log('⚠️ No tenants found. Skipping pipeline seeding.')
    } else {
      const tenantId = tenantResult.rows[0].id

      // Check if default pipeline already exists
      const existingPipeline = await client.query(`
        SELECT id FROM pipelines WHERE tenant_id = $1 AND is_default = true AND deleted_at IS NULL
      `, [tenantId])

      let pipelineId

      if (existingPipeline.rows.length === 0) {
        // Create default pipeline
        const pipelineResult = await client.query(`
          INSERT INTO pipelines (tenant_id, name, description, is_default, is_active)
          VALUES ($1, 'Standard Sales Pipeline', 'Default sales pipeline with 6 stages', true, true)
          RETURNING id
        `, [tenantId])

        pipelineId = pipelineResult.rows[0].id
        console.log('✅ Created default pipeline')

        // Create standard sales stages
        const stages = [
          { name: 'Lead', order: 1, probability: 10, color: '#94a3b8', isClosed: false, isWon: false },
          { name: 'Qualified', order: 2, probability: 25, color: '#60a5fa', isClosed: false, isWon: false },
          { name: 'Proposal', order: 3, probability: 50, color: '#fbbf24', isClosed: false, isWon: false },
          { name: 'Negotiation', order: 4, probability: 75, color: '#fb923c', isClosed: false, isWon: false },
          { name: 'Closed Won', order: 5, probability: 100, color: '#34d399', isClosed: true, isWon: true },
          { name: 'Closed Lost', order: 6, probability: 0, color: '#f87171', isClosed: true, isWon: false },
        ]

        for (const stage of stages) {
          await client.query(`
            INSERT INTO deal_stages
              (tenant_id, pipeline_id, name, display_order, probability, color, is_closed_stage, is_won_stage)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [tenantId, pipelineId, stage.name, stage.order, stage.probability, stage.color, stage.isClosed, stage.isWon])
        }

        console.log('✅ Created 6 default stages (Lead → Qualified → Proposal → Negotiation → Closed Won/Lost)')
      } else {
        pipelineId = existingPipeline.rows[0].id
        console.log('✅ Default pipeline already exists')
      }

      // Update existing deals to use the default pipeline and first stage
      const firstStage = await client.query(`
        SELECT id FROM deal_stages
        WHERE pipeline_id = $1 AND deleted_at IS NULL
        ORDER BY display_order ASC
        LIMIT 1
      `, [pipelineId])

      if (firstStage.rows.length > 0) {
        const firstStageId = firstStage.rows[0].id

        await client.query(`
          UPDATE deals
          SET pipeline_id = $1, stage_id = $2
          WHERE pipeline_id IS NULL AND deleted_at IS NULL
        `, [pipelineId, firstStageId])

        console.log('✅ Updated existing deals with default pipeline and stage')
      }
    }

    console.log('\n✅ Deals schema setup complete!')
    console.log('\nNew tables:')
    console.log('  - pipelines')
    console.log('  - deal_stages')
    console.log('  - deal_stage_history')
    console.log('\nNew columns in deals table:')
    console.log('  - pipeline_id (UUID)')
    console.log('  - stage_id (UUID)')
    console.log('  - contact_id (UUID)')
    console.log('  - currency (VARCHAR)')
    console.log('  - tags (TEXT[])')
    console.log('  - is_closed (BOOLEAN)')
    console.log('  - deleted_at (TIMESTAMP)')
    console.log('  - weighted_amount (NUMERIC)')
    console.log('  - days_in_stage (INTEGER)')
    console.log('  - last_stage_change_at (TIMESTAMP)')
    console.log('  - competitors (TEXT[])')
    console.log('  - decision_makers (TEXT[])')
    console.log('  - key_contacts (TEXT[])')

  } catch (error) {
    console.error('❌ Error setting up deals schema:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

setupDealsSchema()
  .then(() => {
    console.log('\n✅ Migration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
