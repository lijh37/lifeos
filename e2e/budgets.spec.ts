import { test, expect } from '@playwright/test'

const origin = process.env.BASE_URL || 'http://localhost:3000'
const month = new Date().toISOString().slice(0, 7)

async function resetBudget() {
  await fetch(`${origin}/api/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month,
      fixedBudget: 0,
      variableBudget: 0,
      fixedActual: null,
      variableActual: null,
    }),
  })
}

test.describe('Budgets E2E', () => {
  test.afterEach(async () => {
    // Reset budget for the current month to clean state
    await resetBudget()
  })

  test('set a monthly budget and see total', async ({ page }) => {
    await page.goto('/expenses')

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: '月度预算' })).toBeVisible()

    // Fill fixed budget input with placeholder "例: 3200"
    const fixedInput = page.getByPlaceholder('例: 3200')
    await fixedInput.fill('3000')

    // Fill variable budget input with placeholder "例: 1700"
    const variableInput = page.getByPlaceholder('例: 1700')
    await variableInput.fill('2000')

    // Click "保存预算" button
    await page.getByRole('button', { name: '保存预算' }).click()

    // Expect total budget text to reflect 3000+2000=5000
    await expect(page.getByText('总预算：¥5000')).toBeVisible()
  })

  test('enter actuals and see settlement', async ({ page }) => {
    // Setup: create a budget with known values via API
    const setupRes = await fetch(`${origin}/api/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month,
        fixedBudget: 1000,
        variableBudget: 1000,
        fixedActual: null,
        variableActual: null,
      }),
    })
    expect(setupRes.ok).toBe(true)

    await page.goto('/expenses')

    // Wait for the page to finish loading (skeleton disappears)
    await expect(page.getByText('预算设定')).toBeVisible({ timeout: 8000 })

    // Wait for the budget form to show the seeded values
    await expect(page.getByText('总预算：¥2000')).toBeVisible({ timeout: 5000 })

    // Fill actual fixed expense input
    const actualInputs = page.getByPlaceholder('月底填写实际金额')
    await actualInputs.first().fill('500')
    await actualInputs.nth(1).fill('500')

    // Click "录入实际" button
    await page.getByRole('button', { name: '录入实际' }).click()

    // Expect "结算对比" section to appear
    await expect(page.getByRole('heading', { name: '结算对比' })).toBeVisible()

    // Expect summary text: budget surplus (1000+1000=2000 budget - 500+500=1000 actual = 1000 surplus)
    await expect(page.getByText(/预算结余/)).toBeVisible()
  })
})
