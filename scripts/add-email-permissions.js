const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addEmailPermissions() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('\n=== Adding Email Permissions ===\n');

    // 1. Create email permissions
    const emailPermissions = [
      { name: 'emails:read', resource: 'emails', action: 'read', description: 'View emails and email accounts' },
      { name: 'emails:write', resource: 'emails', action: 'write', description: 'Send emails and manage email accounts' },
      { name: 'emails:delete', resource: 'emails', action: 'delete', description: 'Delete email accounts' },
    ];

    for (const perm of emailPermissions) {
      // Check if permission already exists
      const existing = await client.query(
        'SELECT id FROM permissions WHERE name = $1',
        [perm.name]
      );

      if (existing.rows.length > 0) {
        console.log(`✓ Permission already exists: ${perm.name}`);
        continue;
      }

      // Insert permission
      const result = await client.query(
        `INSERT INTO permissions (name, resource, action, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name`,
        [perm.name, perm.resource, perm.action, perm.description]
      );

      console.log(`✓ Created permission: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }

    // 2. Get master_admin and super_admin role IDs
    const rolesResult = await client.query(
      `SELECT id, name FROM roles WHERE name IN ('master_admin', 'super_admin')`
    );

    if (rolesResult.rows.length === 0) {
      throw new Error('No admin roles found');
    }

    console.log('\n=== Assigning Permissions to Admin Roles ===\n');

    // 3. Assign all email permissions to admin roles
    const permissionsResult = await client.query(
      `SELECT id, name FROM permissions WHERE resource = 'emails'`
    );

    for (const role of rolesResult.rows) {
      for (const perm of permissionsResult.rows) {
        // Check if already assigned
        const existing = await client.query(
          'SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
          [role.id, perm.id]
        );

        if (existing.rows.length > 0) {
          console.log(`✓ ${role.name} already has ${perm.name}`);
          continue;
        }

        // Assign permission to role
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)`,
          [role.id, perm.id]
        );

        console.log(`✓ Assigned ${perm.name} to ${role.name}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Email permissions setup complete!\n');
    console.log('All admin users now have access to the Emails feature.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addEmailPermissions().catch((error) => {
  console.error('Failed to add email permissions:', error);
  process.exit(1);
});
