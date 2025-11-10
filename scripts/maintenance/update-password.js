const {Pool} = require('pg');
const bcrypt = require('bcrypt');

async function updatePassword() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'clientforge',
    user: 'crm',
    password: 'password'
  });

  // Generate new hash for admin123
  const hash = await bcrypt.hash('admin123', 12);
  console.log('Generated hash:', hash);

  // Update in database
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, password_hash',
    [hash, 'admin@clientforge.com']
  );

  console.log('Updated user:', result.rows);

  // Test it
  const testResult = await bcrypt.compare('admin123', result.rows[0].password_hash);
  console.log('Password matches:', testResult);

  await pool.end();
}

updatePassword().catch(console.error);
