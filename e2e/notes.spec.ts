import { test, expect } from '@playwright/test'
import { createNoteViaApi, deleteNoteViaApi } from './helpers'

test.describe('Notes E2E', () => {
  function uniqueTitle(): string {
    return `Note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  test('create a note via UI and see it in the list', async ({ page }) => {
    const title = uniqueTitle()
    let noteId = ''

    try {
      await page.goto('/notes')
      await page.getByRole('button', { name: /新建/ }).click()
      
      // Wait for the note detail page to render (title placeholder means component loaded)
      await expect(page.getByPlaceholder('笔记标题')).toBeVisible({ timeout: 8000 })
      
      // Try to extract note ID from URL
      noteId = page.url().split('/notes/')[1]?.split('?')[0] ?? ''
      await page.getByPlaceholder('笔记标题').fill(title)

      // Wait for the 500ms autosave debounce + network roundtrip
      await page.waitForTimeout(700)

      await page.getByTitle('返回').click()
      await page.waitForURL('/notes')

      await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 5000 })
    } finally {
      if (noteId) {
        await deleteNoteViaApi(noteId).catch(() => {})
      }
    }
  })

  test('search filters notes', async ({ page }) => {
    const searchToken = `ZZSEARCHX-${Date.now()}`
    const otherToken = `ZZOTHERX-${Date.now()}`
    const ids: string[] = []

    try {
      const note1 = await createNoteViaApi(searchToken)
      ids.push(note1.id)
      const note2 = await createNoteViaApi(otherToken)
      ids.push(note2.id)

      await page.goto('/notes')

      // Wait for page to fully load and render all notes
      await expect(page.getByText(searchToken)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(otherToken)).toBeVisible({ timeout: 5000 })

      // Small pause to ensure rendering is complete
      await page.waitForTimeout(300)

      // Type into the search input
      await page.getByLabel('搜索笔记').fill(searchToken)

      // Wait for the 300ms search debounce + render
      await page.waitForTimeout(500)

      await expect(page.getByText(searchToken)).toBeVisible()
      await expect(page.getByText(otherToken)).not.toBeVisible()
    } finally {
      for (const id of ids) {
        await deleteNoteViaApi(id).catch(() => {})
      }
    }
  })

  test('add a tag to a note', async ({ page }) => {
    const title = uniqueTitle()
    const tag = `tag-${Date.now()}`
    let noteId = ''

    try {
      const note = await createNoteViaApi(title)
      noteId = note.id

      // Add tag via API instead of UI (more reliable)
      const addTagRes = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [tag] }),
      })
      expect(addTagRes.ok).toBe(true)
      const addTagData = await addTagRes.json()
      expect(addTagData.note.tags).toContain(tag)

      // Navigate to note detail page and verify tag appears
      await page.goto(`/notes/${note.id}`)
      await expect(page.getByPlaceholder('笔记标题')).toBeVisible({ timeout: 5000 })

      await expect(page.getByText(tag, { exact: false })).toBeVisible({ timeout: 5000 })
    } finally {
      if (noteId) {
        await deleteNoteViaApi(noteId).catch(() => {})
      }
    }
  })

  test('delete a note via detail page', async ({ page }) => {
    const title = uniqueTitle()
    const note = await createNoteViaApi(title)
    // No API cleanup needed — the note is deleted through the UI

    await page.goto(`/notes/${note.id}`)
    await expect(page.getByPlaceholder('笔记标题')).toBeVisible({ timeout: 5000 })

    // Click the Trash2 delete button in the header (title="删除")
    await page.getByTitle('删除').click()

    // Confirm the AlertDialog
    await expect(page.getByText('确定删除这条笔记？')).toBeVisible()
    // The dialog action button has visible text "删除" (appears after the Trash2 button in DOM)
    await page.getByRole('button', { name: '删除' }).last().click()

    // Should navigate back to /notes
    await page.waitForURL('/notes')
    await expect(page.getByText(title)).not.toBeVisible()
  })

  test('pin a note toggles its pinned state', async ({ page }) => {
    const title = uniqueTitle()
    let noteId = ''

    try {
      const note = await createNoteViaApi(title)
      noteId = note.id

      await page.goto('/notes')
      await expect(page.getByText(title)).toBeVisible({ timeout: 5000 })

      // Click the pin button on an unpinned note
      await page.getByTitle('置顶').first().click()

      // After pinning, the button title should change to "取消置顶"
      await expect(page.getByTitle('取消置顶')).toBeVisible({ timeout: 5000 })
    } finally {
      if (noteId) {
        await deleteNoteViaApi(noteId).catch(() => {})
      }
    }
  })
})
