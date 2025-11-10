const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Simple hash function (for password reset only)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

async function resetMasterPassword() {
  const client = await pool.connect();

  try {
    console.log('\n=== Checking Master Admin Account ===\n');

    const email = 'master@clientforge.io';

    // First, let's see what accounts exist
    const allUsers = await client.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at'
    );

    console.log('All users in database:');
    allUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.name} (Created: ${user.created_at})`);
    });

    // Check specifically for master account
    const masterUser = await client.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (masterUser.rows.length === 0) {
      console.log(`\n❌ No user found with email: ${email}`);
      console.log('   The master account may have been created with a different email.\n');
      return;
    }

    console.log(`\n✅ Found master account: ${masterUser.rows[0].email}`);
    console.log(`   Name: ${masterUser.rows[0].name}`);
    console.log(`   User ID: ${masterUser.rows[0].id}`);

    const currentHash = masterUser.rows[0].password_hash;
    console.log(`   Password hash exists: ${currentHash ? 'Yes' : 'No'}`);
    console.log(`   Hash preview: ${currentHash ? currentHash.substring(0, 30) + '...' : 'N/A'}`);

    console.log('\n📝 Password should still be valid.');
    console.log('   If you cannot login, the issue may be with:');
    console.log('   1. JWT token expiration');
    console.log('   2. Browser cache');
    console.log('   3. Session storage');
    console.log('\n💡 Try:');
    console.log('   1. Clear browser cache and cookies');
    console.log('   2. Try incognito/private browsing');
    console.log('   3. Check browser console for errors\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetMasterPassword().catch((error) => {
  console.error('Failed to reset password:', error);
  process.exit(1);
});
