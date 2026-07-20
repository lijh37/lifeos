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
  })

  describe('Inline rename', () => {
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
  })

  describe('Delete tag', () => {
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
  })

  describe('Close sheet', () => {
    it('should close sheet when cancel is clicked in delete dialog', async () => {
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

  describe('Keyboard navigation', () => {
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
  })
})
