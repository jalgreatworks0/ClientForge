const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://crm:password@localhost:5432/clientforge',
})

async function checkSchema() {
  try {
    // Check deals table
    const dealsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'deals'
      ORDER BY ordinal_position
    `)
    console.log('✅ Deals table columns:')
    console.log(JSON.stringify(dealsResult.rows, null, 2))

    // Check pipelines table
    const pipelinesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pipelines'
      ORDER BY ordinal_position
    `)
    console.log('\n✅ Pipelines table columns:')
    console.log(JSON.stringify(pipelinesResult.rows, null, 2))

    // Check deal_stages table
    const stagesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'deal_stages'
      ORDER BY ordinal_position
    `)
    console.log('\n✅ Deal Stages table columns:')
    console.log(JSON.stringify(stagesResult.rows, null, 2))

    // Check if we have any pipelines and stages
    const pipelineCount = await pool.query('SELECT COUNT(*) FROM pipelines WHERE deleted_at IS NULL')
    const stageCount = await pool.query('SELECT COUNT(*) FROM deal_stages WHERE deleted_at IS NULL')

    console.log(`\n📊 Pipeline count: ${pipelineCount.rows[0].count}`)
    console.log(`📊 Stage count: ${stageCount.rows[0].count}`)

    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

checkSchema()
