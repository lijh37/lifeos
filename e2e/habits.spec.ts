import { test, expect } from '@playwright/test'

const origin = process.env.BASE_URL || 'http://localhost:3000'

async function createHabitViaApi(name: string): Promise<string> {
  const res = await fetch(`${origin}/api/habits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  return data.habit.id as string
}

async function findHabitIdByName(name: string): Promise<string | null> {
  const res = await fetch(`${origin}/api/habits`)
  const data = await res.json()
  const habit = data.habits.find((h: { name: string }) => h.name === name)
  return habit ? habit.id : null
}

async function deleteHabitViaApi(id: string): Promise<void> {
  await fetch(`${origin}/api/habits?id=${id}`, { method: 'DELETE' })
}

test.describe('Habits E2E', () => {
  test('create a habit via UI', async ({ page }) => {
    const uniqueName = `E2E-Test-Habit-${Date.now()}`

    await page.goto('/habits')

    // Wait for the habits page to load
    await expect(page.getByRole('heading', { name: '习惯' })).toBeVisible()

    // Wait for initial fetch to complete (skeleton disappears)
    // Without this, handleCreate adds habit to state but skeleton still covers it
    await page.locator('.skeleton-pulse').first().waitFor({ state: 'hidden', timeout: 10000 })

    // Click "新建" button
    await page.getByRole('button', { name: '新建' }).click()

    // Fill the input with placeholder "习惯名称…"
    await page.getByPlaceholder('习惯名称…').fill(uniqueName)

    // Click "添加" button
    await page.getByRole('button', { name: '添加' }).click()

    // Expect the habit name to appear in the list
    await expect(page.getByText(uniqueName)).toBeVisible()

    // Cleanup: find the habit via API and delete it
    const id = await findHabitIdByName(uniqueName)
    if (id) {
      await deleteHabitViaApi(id)
    }
  })

  test('toggle a habit completion', async ({ page }) => {
    const uniqueName = `E2E-Toggle-${Date.now()}`

    // Setup: create habit via API
    const habitId = await createHabitViaApi(uniqueName)
    expect(habitId).toBeTruthy()

    await page.goto('/habits')

    // Wait for the habit to appear
    await expect(page.getByText(uniqueName)).toBeVisible()

    // Find the row containing the habit name
    const row = page.locator('.card-hover', { hasText: uniqueName })

    // Click the toggle button (first button in the row - Circle/CheckCircle)
    const toggleButton = row.getByRole('button').first()
    await toggleButton.click()

    // Wait for the check circle to appear (indicating completion)
    // The toggle button contains a CheckCircle when done
    await expect(row.locator('button').first().locator('svg')).toBeVisible()

    // Also verify "本周 1 次" text appears in the row
    await expect(row.getByText('本周 1 次')).toBeVisible()

    // Cleanup
    await deleteHabitViaApi(habitId)
  })

  test('delete a habit via UI', async ({ page }) => {
    const uniqueName = `E2E-Delete-${Date.now()}`

    // Setup: create habit via API
    const habitId = await createHabitViaApi(uniqueName)
    expect(habitId).toBeTruthy()

    await page.goto('/habits')

    // Wait for the habit to appear
    await expect(page.getByText(uniqueName)).toBeVisible()

    // Find the row containing the habit name
    const row = page.locator('.card-hover', { hasText: uniqueName })

    // Click the Trash2 delete button (last button in the row)
    const trashButton = row.locator('button').last()
    await trashButton.click()

    // Wait for AlertDialog to appear and click "删除" action button
    await page.getByRole('button', { name: '删除' }).click()

    // Expect the habit name to no longer be visible
    await expect(page.getByText(uniqueName)).not.toBeVisible()

    // No API cleanup needed since we deleted via UI
  })
})
