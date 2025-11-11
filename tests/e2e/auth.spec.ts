/**
 * E2E Tests: Authentication Flow
 * Tests login, registration, SSO, and MFA
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in credentials
      await page.fill('input[name="email"]', 'test@e2e.com');
      await page.fill('input[name="password"]', 'Test123!@#');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Should show user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'test@e2e.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('input[name="email"]:invalid')).toBeVisible();
      await expect(page.locator('input[name="password"]:invalid')).toBeVisible();
    });

    test('should show password on toggle', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('[data-testid="toggle-password"]');

      // Initially should be password type
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle
      await toggleButton.click();

      // Should be text type
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  test.describe('Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      await page.goto('/register');

      const timestamp = Date.now();
      const email = `newuser${timestamp}@e2e.com`;

      // Fill registration form
      await page.fill('input[name="firstName"]', 'New');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'NewUser123!@#');
      await page.fill('input[name="confirmPassword"]', 'NewUser123!@#');
      await page.fill('input[name="companyName"]', 'Test Company');

      // Accept terms
      await page.check('input[name="acceptTerms"]');

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to dashboard or email verification page
      await page.waitForURL(/\/(dashboard|verify-email)/);
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      const passwordInput = page.locator('input[name="password"]');

      // Weak password
      await passwordInput.fill('weak');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText('Weak');

      // Strong password
      await passwordInput.fill('StrongP@ssw0rd!');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText('Strong');
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="password"]', 'Test123!@#');
      await page.fill('input[name="confirmPassword"]', 'Different123!@#');

      await page.click('button[type="submit"]');

      await expect(page.locator('[data-testid="error-message"]')).toContainText('match');
    });
  });

  test.describe('SSO', () => {
    test('should show SSO buttons', async ({ page }) => {
      await page.goto('/login');

      // Should show Google SSO button
      await expect(page.locator('[data-testid="sso-google"]')).toBeVisible();

      // Should show Microsoft SSO button
      await expect(page.locator('[data-testid="sso-microsoft"]')).toBeVisible();
    });

    test('should initiate Google SSO flow', async ({ page, context }) => {
      await page.goto('/login');

      // Mock SSO popup
      const popupPromise = context.waitForEvent('page');
      await page.click('[data-testid="sso-google"]');

      const popup = await popupPromise;
      await expect(popup).toHaveURL(/accounts\.google\.com/);
    });
  });

  test.describe('MFA', () => {
    test.use({ storageState: './tests/e2e/auth-state.json' });

    test('should setup TOTP MFA', async ({ page }) => {
      await page.goto('/settings/security');

      // Enable MFA
      await page.click('[data-testid="enable-mfa"]');

      // Should show QR code
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();

      // Should show backup codes
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();
    });

    test('should require MFA code on login when enabled', async ({ page }) => {
      // This test assumes MFA is enabled for test user
      await page.goto('/login');

      await page.fill('input[name="email"]', 'test@e2e.com');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');

      // Should show MFA code input
      await expect(page.locator('input[name="mfaCode"]')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test.use({ storageState: './tests/e2e/auth-state.json' });

    test('should logout successfully', async ({ page }) => {
      await page.goto('/dashboard');

      // Open user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Should not be able to access protected pages
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
