import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagManagerSheet } from '@/components/tag-manager-sheet'

// Mock sonner toast (used by other components in the project)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function createTag(name: string, count: number = 1) {
  return { name, count }
}

const defaultTags = [
  createTag('work', 3),
  createTag('personal', 5),
  createTag('__untagged__', 1),
]

function renderSheet({
  open = true,
  onOpenChange = vi.fn(),
  onTagSelect,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onTagSelect?: (tag: string) => void
} = {}) {
  return render(
    <TagManagerSheet
      open={open}
      onOpenChange={onOpenChange}
      onTagSelect={onTagSelect}
    />
  )
}

describe('TagManagerSheet', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default: return tags list
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tags: defaultTags }),
    })
  })

  describe('Loading state', () => {
    it('should show loading indicator when sheet opens and fetch is in flight', async () => {
      // Keep fetch unresolved so loading persists
      mockFetch.mockImplementationOnce(() => new Promise(() => {}))
      renderSheet()

      // Loading text should appear immediately
      expect(screen.getByText('加载中…')).toBeInTheDocument()
    })

    it('should not call fetch when sheet is closed', () => {
      renderSheet({ open: false })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Empty state', () => {
    it('should show empty message when tags list is empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tags: [] }),
      })
      renderSheet()

      await waitFor(() => {
        expect(
          screen.getByText('还没有标签，创建笔记即可添加标签')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Tag list rendering', () => {
    it('should render sheet title', async () => {
      renderSheet()
      await waitFor(() => {
        expect(screen.getByText('标签管理')).toBeInTheDocument()
      })
    })

    it('should render all tags with names and counts', async () => {
      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
        expect(screen.getByText('personal')).toBeInTheDocument()
        expect(screen.getByText('未分类')).toBeInTheDocument()
      })

      // Counts should be displayed
      expect(screen.getByText('3 条')).toBeInTheDocument()
      expect(screen.getByText('5 条')).toBeInTheDocument()
      expect(screen.getByText('1 条')).toBeInTheDocument()
    })

    it('should display __untagged__ as 未分类', async () => {
      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('未分类')).toBeInTheDocument()
      })
    })
  })

  describe('Tag selection', () => {
    it('should call onTagSelect and close sheet when a tag is clicked', async () => {
      const onTagSelect = vi.fn()
      const onOpenChange = vi.fn()
      renderSheet({ onTagSelect, onOpenChange })

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click the tag name button
      fireEvent.click(screen.getByText('work'))

      expect(onTagSelect).toHaveBeenCalledWith('work')
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should work when onTagSelect is not provided', async () => {
      const onOpenChange = vi.fn()
      renderSheet({ onOpenChange })

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('work'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Inline rename', () => {
    it('should show edit input when pencil icon is clicked', async () => {
      renderSheet()

      // Wait for tags to render
      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Find pencil buttons via the lucide-pencil SVG icon class
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      expect(pencilSvgs.length).toBeGreaterThan(0)

      // Click the first pencil button
      const firstPencilBtn = pencilSvgs[0].closest('button')
      expect(firstPencilBtn).not.toBeNull()
      fireEvent.click(firstPencilBtn!)

      // Now editing input should appear for the first tag (work)
      const input = screen.getByDisplayValue('work')
      expect(input).toBeInTheDocument()
    })

    it('should call rename API on Enter key and update the tag name', async () => {
      // Mock successful rename
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil to start editing
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      // Change the value
      fireEvent.change(input, { target: { value: 'office' } })
      // Press Enter
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/tags', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: 'work', newName: 'office' }),
        })
      })

      // Tag name should be updated in the list
      await waitFor(() => {
        expect(screen.getByText('office')).toBeInTheDocument()
      })
    })

    it('should do nothing when rename value is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: defaultTags }),
      })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      // Clear the value
      fireEvent.change(input, { target: { value: ' ' } })
      // Press Enter
      fireEvent.keyDown(input, { key: 'Enter' })

      // fetch should not have been called for rename
      // Only the initial fetch should exist
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when rename value is same as old name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: defaultTags }),
      })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      // Press Enter without changing the value
      fireEvent.keyDown(input, { key: 'Enter' })

      // fetch should not have been called for rename (same name)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should cancel editing when Escape is pressed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: defaultTags }),
      })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      expect(input).toBeInTheDocument()

      // Press Escape to cancel
      fireEvent.keyDown(input, { key: 'Escape' })

      // The input should be gone, tag name should be visible again
      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })
    })

    it('should show success message after successful rename', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      fireEvent.change(input, { target: { value: 'office' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText(/已重命名为/)).toBeInTheDocument()
      })
    })

    it('should show error message when rename API fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Rename failed' }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      fireEvent.change(input, { target: { value: 'office' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('重命名失败')).toBeInTheDocument()
      })
    })

    it('should confirm rename via the check button', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      fireEvent.change(input, { target: { value: 'office' } })

      // Click the check (confirm) button
      const checkSvgs = document.querySelectorAll('.lucide-check')
      expect(checkSvgs.length).toBeGreaterThan(0)
      fireEvent.click(checkSvgs[0].closest('button')!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/tags', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: 'work', newName: 'office' }),
        })
      })
    })

    it('should cancel rename via the X button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: defaultTags }),
      })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click pencil
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      expect(input).toBeInTheDocument()

      // Click the X (cancel) button
      const xSvgs = document.querySelectorAll('.lucide-x')
      expect(xSvgs.length).toBeGreaterThan(0)
      fireEvent.click(xSvgs[0].closest('button')!)

      // Should return to display mode
      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })
    })
  })

  describe('Delete tag', () => {
    it('should show delete confirmation dialog when trash icon is clicked', async () => {
      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Find trash buttons
      const trashSvgs = document.querySelectorAll('.lucide-trash-2')
      expect(trashSvgs.length).toBeGreaterThan(0)

      // Click the first trash button
      fireEvent.click(trashSvgs[0].closest('button')!)

      // Alert dialog should appear
      await waitFor(() => {
        expect(
          screen.getByText(/确定删除标签「work」/)
        ).toBeInTheDocument()
      })

      expect(
        screen.getByText('将从所有笔记中移除该标签。')
      ).toBeInTheDocument()
    })

    it('should call DELETE API when confirm is clicked and remove tag from list', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click trash
      const trashSvgs = document.querySelectorAll('.lucide-trash-2')
      fireEvent.click(trashSvgs[0].closest('button')!)

      // Find and click the "删除" confirm button in the AlertDialog
      await waitFor(() => {
        expect(
          screen.getByText(/确定删除标签「work」/)
        ).toBeInTheDocument()
      })

      // Click the delete confirm button
      const deleteBtn = screen.getByRole('button', { name: '删除' })
      fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tags?name=work',
          { method: 'DELETE' }
        )
      })

      // Tag should be removed from the list
      await waitFor(() => {
        expect(screen.queryByText('work')).not.toBeInTheDocument()
      })
    })

    it('should show success message after successful deletion', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click trash
      const trashSvgs = document.querySelectorAll('.lucide-trash-2')
      fireEvent.click(trashSvgs[0].closest('button')!)

      await waitFor(() => {
        expect(
          screen.getByText(/确定删除标签「work」/)
        ).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: '删除' }))

      await waitFor(() => {
        expect(screen.getByText(/标签「work」已删除/)).toBeInTheDocument()
      })
    })

    it('should show error message when delete API fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Delete failed' }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click trash
      const trashSvgs = document.querySelectorAll('.lucide-trash-2')
      fireEvent.click(trashSvgs[0].closest('button')!)

      await waitFor(() => {
        expect(
          screen.getByText(/确定删除标签「work」/)
        ).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: '删除' }))

      await waitFor(() => {
        expect(screen.getByText('删除失败')).toBeInTheDocument()
      })
    })

    it('should close dialog when cancel is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: defaultTags }),
      })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Click trash
      const trashSvgs = document.querySelectorAll('.lucide-trash-2')
      fireEvent.click(trashSvgs[0].closest('button')!)

      await waitFor(() => {
        expect(
          screen.getByText(/确定删除标签「work」/)
        ).toBeInTheDocument()
      })

      // Click cancel
      const cancelBtn = screen.getByRole('button', { name: '取消' })
      fireEvent.click(cancelBtn)

      // Dialog should close and tag should remain
      await waitFor(() => {
        expect(
          screen.queryByText(/确定删除标签「work」/)
        ).not.toBeInTheDocument()
      })
      expect(screen.getByText('work')).toBeInTheDocument()
    })
  })

  describe('Message bar', () => {
    it('should show success message with green styling after rename', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Trigger rename to show success message (use exact same flow as passing inline rename test)
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      fireEvent.change(input, { target: { value: 'office' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // The success message text should appear
      await waitFor(() => {
        expect(screen.getByText(/已重命名为/)).toBeInTheDocument()
      })

      // Separately check the message has green class styling
      const msgEl = screen.getByText(/已重命名为/)
      expect(msgEl.className).toContain('green')
    })

    it('should show error message with red styling when rename fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Failed' }),
        })

      renderSheet()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
      })

      // Trigger rename to show error message
      const pencilSvgs = document.querySelectorAll('.lucide-pencil')
      fireEvent.click(pencilSvgs[0].closest('button')!)

      const input = screen.getByDisplayValue('work')
      fireEvent.change(input, { target: { value: 'office' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('重命名失败')).toBeInTheDocument()
      })

      // Separately check the message has red class styling
      const msgEl = screen.getByText('重命名失败')
      expect(msgEl.className).toContain('red')
    })
  })

  describe('Re-fetch on open', () => {
    it('should fetch tags when sheet is opened, and refetch on reopen', async () => {
      // Track fetch calls manually within the test
      const fetchCalls: string[] = []
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        fetchCalls.push(url)
        return Promise.resolve({
          ok: true,
          json: async () => ({ tags: defaultTags }),
        })
      })

      const { rerender } = render(
        <TagManagerSheet
          open={false}
          onOpenChange={vi.fn()}
        />
      )

      expect(fetchCalls).toHaveLength(0)

      // Open the sheet
      rerender(
        <TagManagerSheet
          open={true}
          onOpenChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(fetchCalls).toHaveLength(1)
        expect(fetchCalls[0]).toBe('/api/tags')
      })

      // Close
      rerender(
        <TagManagerSheet
          open={false}
          onOpenChange={vi.fn()}
        />
      )

      // A brief pause to let effects settle
      await new Promise(r => setTimeout(r, 50))

      // Reopen
      rerender(
        <TagManagerSheet
          open={true}
          onOpenChange={vi.fn()}
        />
      )

      await waitFor(() => {
        // Should fetch again on reopen
        expect(fetchCalls).toHaveLength(2)
        expect(fetchCalls[1]).toBe('/api/tags')
      })
    })
  })
})
