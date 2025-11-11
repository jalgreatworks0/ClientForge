const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clientforge_crm'
});

async function checkPermissions() {
  try {
    // Check if emails:read permission exists
    const permResult = await pool.query(`
      SELECT id, name, resource, action
      FROM permissions
      WHERE name = 'emails:read' OR resource = 'emails'
    `);

    console.log('\n=== Email Permissions ===');
    if (permResult.rows.length === 0) {
      console.log('❌ No email permissions found in database');
      console.log('   This is likely the issue - the emails:read permission does not exist');
    } else {
      permResult.rows.forEach(row => {
        console.log(`✓ ${row.name}: ${row.resource}:${row.action} (ID: ${row.id})`);
      });
    }

    // Check master admin role permissions
    const rolePerms = await pool.query(`
      SELECT r.name as role_name, p.name as permission_name
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = 'master_admin' AND p.resource = 'emails'
    `);

    console.log('\n=== Master Admin Email Permissions ===');
    if (rolePerms.rows.length === 0) {
      console.log('❌ Master admin does not have email permissions assigned');
    } else {
      rolePerms.rows.forEach(row => {
        console.log(`✓ ${row.role_name} has ${row.permission_name}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkPermissions();
