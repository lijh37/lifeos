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
})
