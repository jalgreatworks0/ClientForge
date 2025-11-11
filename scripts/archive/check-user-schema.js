const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    // Check users table schema
    const schema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('\n=== Users Table Schema ===\n');
    schema.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check if master@clientforge.io exists
    const users = await pool.query(`
      SELECT * FROM users WHERE email = 'master@clientforge.io'
    `);

    console.log('\n=== Master Admin Account ===\n');
    if (users.rows.length > 0) {
      const user = users.rows[0];
      Object.keys(user).forEach(key => {
        if (key === 'password_hash') {
          console.log(`  - ${key}: ${user[key] ? user[key].substring(0, 20) + '...' : 'NULL'}`);
        } else {
          console.log(`  - ${key}: ${user[key]}`);
        }
      });
    } else {
      console.log('  ❌ No user found with email master@clientforge.io');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
