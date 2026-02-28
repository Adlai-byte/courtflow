import { test, expect } from '@playwright/test'

test.describe('Public flows', () => {
  test('landing page loads with hero, features, and how-it-works', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/CourtFLOW/)
    await expect(page.getByRole('link', { name: 'CourtFLOW' })).toBeVisible()
    await expect(page.locator('#features')).toBeVisible()
    await expect(page.locator('#how-it-works')).toBeVisible()
  })

  test('explore page loads and shows heading', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveTitle(/Explore Facilities/)
    await expect(page.getByRole('heading', { name: /browse facilities/i })).toBeVisible()
  })

  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Sign In/)
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('signup page renders with fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveTitle(/Create Account/)
    await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('invalid slug shows not-found page', async ({ page }) => {
    await page.goto('/nonexistent-slug-xyz-12345')
    await expect(page.getByText(/not found/i)).toBeVisible()
  })

  test('admin unauthenticated redirects to login', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('dashboard unauthenticated redirects to login', async ({ page }) => {
    await page.goto('/dashboard/test')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('404 page has link back to home', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist')
    await expect(page.getByText(/not found/i)).toBeVisible()
    const homeLink = page.getByRole('link', { name: /back to home|home/i })
    await expect(homeLink).toBeVisible()
  })
})
