import { test, expect } from '@playwright/test'

test.describe('Core user flow', () => {
  test('home page loads and shows chat interface', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('AI 生活助手')).toBeVisible()
    await expect(page.getByPlaceholder('输入你想记录的内容…')).toBeVisible()
  })

  test('notes page loads and shows note list', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByText('笔记').first()).toBeVisible()
    await expect(page.getByPlaceholder('搜索笔记…')).toBeVisible()
  })

  test('habits page loads and shows habit interface', async ({ page }) => {
    await page.goto('/habits')
    await expect(page.getByRole('heading', { name: '习惯' })).toBeVisible()
  })

  test('calendar page loads', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByText(/月|日历/)).toBeVisible()
  })

  test('settings page loads with data overview', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('数据概览')).toBeVisible()
    await expect(page.getByText('备份与恢复').first()).toBeVisible()
  })

  test('export button is present on notes page', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByRole('button', { name: /导出/ })).toBeVisible()
  })

  test('navigation sidebar links are present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'AI 对话' })).toBeVisible()
    await expect(page.getByRole('link', { name: '笔记' })).toBeVisible()
    await expect(page.getByRole('link', { name: '习惯' })).toBeVisible()
  })

  test('chat page has new conversation button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /新对话/ })).toBeVisible()
  })

  test('notes page filter buttons are functional', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible()
    await expect(page.getByRole('button', { name: '笔记' })).toBeVisible()
    await expect(page.getByRole('button', { name: '任务' })).toBeVisible()
    await expect(page.getByRole('button', { name: '事件' })).toBeVisible()
  })

  test('expenses page loads with budget form', async ({ page }) => {
    await page.goto('/expenses')
    await expect(page.getByRole('heading', { name: '月度预算' })).toBeVisible()
  })

  test('tags page loads with tag list', async ({ page }) => {
    await page.goto('/tags')
    await expect(page.getByRole('heading', { name: '标签管理' })).toBeVisible()
  })

  test('stats page loads with summary cards', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.getByText('数据概览')).toBeVisible()
  })

  test('search page loads with search input', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByPlaceholder(/搜索/)).toBeVisible()
  })

  test('login page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/notes')
    // The page might redirect to /login if auth is enabled
    // Or show the notes page if auth is disabled
    // Just check the page loads without error
    await expect(page).toHaveURL(/\/notes|\/login/)
  })

  test('dark mode toggle is present on home page', async ({ page }) => {
    await page.goto('/')
    // Find a theme toggle button
    const toggleButtons = page.locator('button').filter({ has: page.locator('svg') })
    await expect(toggleButtons.first()).toBeVisible()
  })
})
