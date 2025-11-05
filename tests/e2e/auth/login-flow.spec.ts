/**
 * E2E Tests: Login Flow
 * End-to-end browser testing for authentication
 */

import { test, expect, Page } from '@playwright/test'

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
}

const INVALID_CREDENTIALS = {
  email: 'wrong@example.com',
  password: 'WrongPassword123!',
}

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
  })

  test('should display login form correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/ClientForge CRM/)

    // Check form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Check for "Forgot password?" link
    await expect(page.locator('text=Forgot password?')).toBeVisible()

    // Check for "Sign up" link
    await expect(page.locator('text=Sign up')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('should show error for invalid email format', async ({ page }) => {
    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Check for email format error
    await expect(
      page.locator('text=Please enter a valid email address')
    ).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[name="email"]', INVALID_CREDENTIALS.email)
    await page.fill('input[name="password"]', INVALID_CREDENTIALS.password)
    await page.click('button[type="submit"]')

    // Wait for error message
    await expect(
      page.locator('text=Invalid email or password')
    ).toBeVisible({ timeout: 5000 })

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    // Enter valid credentials
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Check for welcome message or user menu
    await expect(
      page.locator(`text=${TEST_USER.firstName}`)
    ).toBeVisible()
  })

  test('should remember email when "Remember me" is checked', async ({
    page,
  }) => {
    // Fill in email
    await page.fill('input[name="email"]', TEST_USER.email)

    // Check "Remember me" checkbox
    const rememberCheckbox = page.locator('input[name="remember"]')
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check()
    }

    // Reload page
    await page.reload()

    // Email should still be filled
    const emailInput = page.locator('input[name="email"]')
    if (await rememberCheckbox.isVisible()) {
      await expect(emailInput).toHaveValue(TEST_USER.email)
    }
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]')
    const toggleButton = page.locator('button[aria-label="Toggle password visibility"]')

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click toggle button if it exists
    if (await toggleButton.isVisible()) {
      await toggleButton.click()

      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text')

      // Click again to hide
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })

  test('should navigate to forgot password page', async ({ page }) => {
    // Click "Forgot password?" link
    await page.click('text=Forgot password?')

    // Should navigate to forgot password page
    await expect(page).toHaveURL(/\/forgot-password/)

    // Check for email input
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('should navigate to registration page', async ({ page }) => {
    // Click "Sign up" link
    await page.click('text=Sign up')

    // Should navigate to registration page
    await expect(page).toHaveURL(/\/register/)

    // Check for registration form fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible()
    await expect(page.locator('input[name="lastName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('should show loading state during login', async ({ page }) => {
    // Enter credentials
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)

    // Submit form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Check for loading state (spinner or disabled button)
    await expect(submitButton).toBeDisabled()
  })

  test('should handle session timeout gracefully', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Clear local storage to simulate session timeout
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Try to access protected page
    await page.goto('/contacts')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should prevent multiple simultaneous login attempts', async ({
    page,
  }) => {
    // Fill credentials
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)

    // Click submit button multiple times rapidly
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    await submitButton.click()
    await submitButton.click()

    // Button should be disabled after first click
    await expect(submitButton).toBeDisabled()
  })
})

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should successfully logout', async ({ page }) => {
    // Click user menu
    await page.click('[aria-label="User menu"]')

    // Click logout
    await page.click('text=Logout')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)

    // Try to access protected page
    await page.goto('/dashboard')

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should clear session data on logout', async ({ page }) => {
    // Logout
    await page.click('[aria-label="User menu"]')
    await page.click('text=Logout')

    // Check that session storage is cleared
    const hasToken = await page.evaluate(() => {
      return !!localStorage.getItem('accessToken')
    })

    expect(hasToken).toBe(false)
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/login')

    // Form should be visible and properly sized
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should display correctly on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/login')

    // Form should be visible and properly sized
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login')

    // Check for ARIA labels on form elements
    await expect(page.locator('input[aria-label="Email"]')).toBeVisible()
    await expect(page.locator('input[aria-label="Password"]')).toBeVisible()
    await expect(
      page.locator('button[aria-label="Sign in"]')
    ).toBeVisible()
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login')

    // Tab through form elements
    await page.keyboard.press('Tab')
    await expect(page.locator('input[name="email"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('input[name="password"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('button[type="submit"]')).toBeFocused()
  })

  test('should submit form with Enter key', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)

    // Press Enter to submit
    await page.keyboard.press('Enter')

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })
})
