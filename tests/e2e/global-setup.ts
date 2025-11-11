/**
 * Playwright Global Setup
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { Pool } from 'pg';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Running global E2E test setup...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // =============================================================================
  // DATABASE SETUP
  // =============================================================================
  console.log('📦 Setting up test database...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clientforge_e2e',
  });

  try {
    // Clear all test data
    await pool.query('TRUNCATE TABLE users, tenants, contacts, deals, invoices RESTART IDENTITY CASCADE');
    console.log('✅ Database cleared');

    // Create test tenant
    const tenantResult = await pool.query(
      `INSERT INTO tenants (name, subdomain, status)
       VALUES ('E2E Test Company', 'e2e-test', 'active')
       RETURNING id`
    );
    const tenantId = tenantResult.rows[0].id;

    // Create test user
    await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, status)
       VALUES ($1, 'test@e2e.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test', 'User', 'admin', 'active')`,
      [tenantId]
    );
    console.log('✅ Test user created');

    // Store test data for tests
    process.env.TEST_TENANT_ID = tenantId;
    process.env.TEST_USER_EMAIL = 'test@e2e.com';
    process.env.TEST_USER_PASSWORD = 'Test123!@#';

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }

  // =============================================================================
  // AUTHENTICATION STATE
  // =============================================================================
  console.log('🔐 Creating authenticated session...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Fill in login form
    await page.fill('input[name="email"]', 'test@e2e.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });

    // Save authenticated state
    await context.storageState({ path: './tests/e2e/auth-state.json' });
    console.log('✅ Auth state saved');

  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup complete!\n');
}

export default globalSetup;
