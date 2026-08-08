import { test, expect } from '@playwright/test'

test.describe('LifeOS smoke test', () => {
  test('login page redirects to notes when auth is disabled', async ({ page }) => {
    await page.goto('/login')
    await page.waitForURL('/notes', { timeout: 5000 })
    await expect(page.getByLabel('搜索笔记')).toBeVisible({ timeout: 5000 })
  })

  test('notes page loads when auto-auth is enabled', async ({ page }) => {
    await page.goto('/notes')
    // With APP_PASSWORD='' the middleware auto-allows, so /notes renders directly
    await expect(page.getByLabel('搜索笔记')).toBeVisible({ timeout: 5000 })
  })
})
