const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('\n=== Running AI Features Migration ===\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', '008_ai_features_tables.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Failed to run migration:', error);
  process.exit(1);
});
