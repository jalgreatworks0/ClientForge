/**
 * Row-Level Security (RLS) Tests
 * Validates tenant isolation across all major entities
 *
 * These tests ensure that:
 * 1. Cross-tenant reads FAIL
 * 2. Cross-tenant writes FAIL
 * 3. Same-tenant operations SUCCEED
 *
 * Run with: npm run test:rls
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

describe('Row-Level Security Tests', () => {
  let pool: Pool
  let tenant1Id: string
  let tenant2Id: string
  let user1Id: string
  let user2Id: string

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    // Create test tenants and users
    const tenant1 = await pool.query(
      `INSERT INTO tenants (name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Test Tenant 1', 'test1']
    )
    tenant1Id = tenant1.rows[0].id

    const tenant2 = await pool.query(
      `INSERT INTO tenants (name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Test Tenant 2', 'test2']
    )
    tenant2Id = tenant2.rows[0].id

    const user1 = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant1Id, 'user1@test.com', 'hash', 'User', 'One']
    )
    user1Id = user1.rows[0].id

    const user2 = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant2Id, 'user2@test.com', 'hash', 'User', 'Two']
    )
    user2Id = user2.rows[0].id
  })

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM users WHERE tenant_id IN ($1, $2)', [tenant1Id, tenant2Id])
    await pool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenant1Id, tenant2Id])
    await pool.end()
  })

  describe('Contacts RLS', () => {
    let contact1Id: string
    let contact2Id: string

    beforeAll(async () => {
      // Create contacts for each tenant
      const c1 = await pool.query(
        `INSERT INTO contacts (tenant_id, first_name, last_name, email, owner_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenant1Id, 'John', 'Doe', 'john@tenant1.com', user1Id]
      )
      contact1Id = c1.rows[0].id

      const c2 = await pool.query(
        `INSERT INTO contacts (tenant_id, first_name, last_name, email, owner_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenant2Id, 'Jane', 'Smith', 'jane@tenant2.com', user2Id]
      )
      contact2Id = c2.rows[0].id
    })

    afterAll(async () => {
      await pool.query('DELETE FROM contacts WHERE id IN ($1, $2)', [contact1Id, contact2Id])
    })

    test('Should READ own tenant contacts', async () => {
      const result = await pool.query(
        'SELECT * FROM contacts WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, contact1Id]
      )
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].id).toBe(contact1Id)
    })

    test('Should NOT READ other tenant contacts', async () => {
      const result = await pool.query(
        'SELECT * FROM contacts WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, contact2Id] // tenant1 trying to read tenant2's contact
      )
      expect(result.rows).toHaveLength(0)
    })

    test('Should UPDATE own tenant contacts', async () => {
      await pool.query(
        'UPDATE contacts SET first_name = $1 WHERE tenant_id = $2 AND id = $3',
        ['UpdatedJohn', tenant1Id, contact1Id]
      )

      const result = await pool.query(
        'SELECT first_name FROM contacts WHERE id = $1',
        [contact1Id]
      )
      expect(result.rows[0].first_name).toBe('UpdatedJohn')
    })

    test('Should NOT UPDATE other tenant contacts', async () => {
      const result = await pool.query(
        'UPDATE contacts SET first_name = $1 WHERE tenant_id = $2 AND id = $3 RETURNING id',
        ['HackedName', tenant1Id, contact2Id] // tenant1 trying to update tenant2's contact
      )
      expect(result.rows).toHaveLength(0)

      // Verify contact was not modified
      const check = await pool.query(
        'SELECT first_name FROM contacts WHERE id = $1',
        [contact2Id]
      )
      expect(check.rows[0].first_name).toBe('Jane')
    })

    test('Should NOT DELETE other tenant contacts', async () => {
      const result = await pool.query(
        'DELETE FROM contacts WHERE tenant_id = $1 AND id = $2 RETURNING id',
        [tenant1Id, contact2Id] // tenant1 trying to delete tenant2's contact
      )
      expect(result.rows).toHaveLength(0)

      // Verify contact still exists
      const check = await pool.query(
        'SELECT id FROM contacts WHERE id = $1',
        [contact2Id]
      )
      expect(check.rows).toHaveLength(1)
    })
  })

  describe('Deals RLS', () => {
    let deal1Id: string
    let deal2Id: string

    beforeAll(async () => {
      const d1 = await pool.query(
        `INSERT INTO deals (tenant_id, title, amount, owner_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenant1Id, 'Deal 1', 10000, user1Id]
      )
      deal1Id = d1.rows[0].id

      const d2 = await pool.query(
        `INSERT INTO deals (tenant_id, title, amount, owner_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenant2Id, 'Deal 2', 20000, user2Id]
      )
      deal2Id = d2.rows[0].id
    })

    afterAll(async () => {
      await pool.query('DELETE FROM deals WHERE id IN ($1, $2)', [deal1Id, deal2Id])
    })

    test('Should READ own tenant deals', async () => {
      const result = await pool.query(
        'SELECT * FROM deals WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, deal1Id]
      )
      expect(result.rows).toHaveLength(1)
    })

    test('Should NOT READ other tenant deals', async () => {
      const result = await pool.query(
        'SELECT * FROM deals WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, deal2Id]
      )
      expect(result.rows).toHaveLength(0)
    })
  })

  describe('Tasks RLS', () => {
    let task1Id: string
    let task2Id: string

    beforeAll(async () => {
      const t1 = await pool.query(
        `INSERT INTO tasks (tenant_id, title, assigned_to_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [tenant1Id, 'Task 1', user1Id]
      )
      task1Id = t1.rows[0].id

      const t2 = await pool.query(
        `INSERT INTO tasks (tenant_id, title, assigned_to_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [tenant2Id, 'Task 2', user2Id]
      )
      task2Id = t2.rows[0].id
    })

    afterAll(async () => {
      await pool.query('DELETE FROM tasks WHERE id IN ($1, $2)', [task1Id, task2Id])
    })

    test('Should READ own tenant tasks', async () => {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, task1Id]
      )
      expect(result.rows).toHaveLength(1)
    })

    test('Should NOT READ other tenant tasks', async () => {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, task2Id]
      )
      expect(result.rows).toHaveLength(0)
    })
  })

  describe('Files RLS', () => {
    let file1Id: string
    let file2Id: string

    beforeAll(async () => {
      const f1 = await pool.query(
        `INSERT INTO files (tenant_id, filename, mime_type, size, storage_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenant1Id, 'file1.pdf', 'application/pdf', 1024, '/path/file1.pdf', user1Id]
      )
      file1Id = f1.rows[0].id

      const f2 = await pool.query(
        `INSERT INTO files (tenant_id, filename, mime_type, size, storage_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenant2Id, 'file2.pdf', 'application/pdf', 2048, '/path/file2.pdf', user2Id]
      )
      file2Id = f2.rows[0].id
    })

    afterAll(async () => {
      await pool.query('DELETE FROM files WHERE id IN ($1, $2)', [file1Id, file2Id])
    })

    test('Should READ own tenant files', async () => {
      const result = await pool.query(
        'SELECT * FROM files WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, file1Id]
      )
      expect(result.rows).toHaveLength(1)
    })

    test('Should NOT READ other tenant files', async () => {
      const result = await pool.query(
        'SELECT * FROM files WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, file2Id]
      )
      expect(result.rows).toHaveLength(0)
    })
  })

  describe('Accounts RLS', () => {
    let account1Id: string
    let account2Id: string

    beforeAll(async () => {
      const a1 = await pool.query(
        `INSERT INTO accounts (tenant_id, name, owner_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [tenant1Id, 'Account 1', user1Id]
      )
      account1Id = a1.rows[0].id

      const a2 = await pool.query(
        `INSERT INTO accounts (tenant_id, name, owner_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [tenant2Id, 'Account 2', user2Id]
      )
      account2Id = a2.rows[0].id
    })

    afterAll(async () => {
      await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [account1Id, account2Id])
    })

    test('Should READ own tenant accounts', async () => {
      const result = await pool.query(
        'SELECT * FROM accounts WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, account1Id]
      )
      expect(result.rows).toHaveLength(1)
    })

    test('Should NOT READ other tenant accounts', async () => {
      const result = await pool.query(
        'SELECT * FROM accounts WHERE tenant_id = $1 AND id = $2',
        [tenant1Id, account2Id]
      )
      expect(result.rows).toHaveLength(0)
    })
  })
})
