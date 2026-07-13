import { test, expect } from '@playwright/test'

test.describe('LifeOS smoke test', () => {
  test('login page loads and shows password form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /登录/i })).toBeVisible()
    await expect(page.getByPlaceholder(/密码/i)).toBeVisible()
  })

  test('notes page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/notes')
    // Should redirect to /login with ?from= parameter
    await expect(page).toHaveURL(/\/login/)
  })

  test('PWA manifest is served', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest.name).toContain('LifeOS')
    expect(manifest.display).toBe('standalone')
  })
})
