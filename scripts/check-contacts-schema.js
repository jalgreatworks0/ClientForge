const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://crm:password@localhost:5432/clientforge',
})

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'contacts'
      ORDER BY ordinal_position
    `)

    console.log('Contacts table columns:')
    console.log(JSON.stringify(result.rows, null, 2))

    await pool.end()
  } catch (error) {
    console.error('Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

checkSchema()
