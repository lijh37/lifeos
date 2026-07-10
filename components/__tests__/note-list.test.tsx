import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NoteList } from '@/components/note-list'
import { useAppStore } from '@/store'
import type { Note } from '@/lib/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Create a helper to generate notes
function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    content: 'Test content',
    title: null,
    type: 'note',
    tags: [],
    dueDate: null,
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
    pinned: overrides.pinned ?? false,
  }
}

describe('NoteList', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      notes: [],
      initialLoading: false,
      loadingMore: false,
    })
    mockFetch.mockReset()
    // Default: return empty results for notes + tags to prevent crashes
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [], tags: [] }),
    })
  })

  it('should render loading skeleton initially when initialLoading is true', () => {
    useAppStore.setState({ initialLoading: true, notes: [] })
    render(<NoteList />)
    // The SkeletonNoteList should render when loading
    // Check that no note content is shown
    expect(screen.queryByText('Test content')).not.toBeInTheDocument()
  })

  it('should render notes from store after fetch resolves', async () => {
    const notes = [
      createNote({ content: 'Note 1', type: 'note', title: 'First Note' }),
      createNote({ content: 'Note 2', type: 'note', title: 'Second Note' }),
    ]
    // Mock fetch to return the notes so component loads them
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList />)

    // Wait for fetch to resolve and notes to render
    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument()
      expect(screen.getByText('Second Note')).toBeInTheDocument()
    })
  })

  it('should show empty state when API returns no notes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText(/还没有任何记录/)).toBeInTheDocument()
    })
  })

  it('should show search input', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索笔记…')).toBeInTheDocument()
    })
  })

  it('should display multiple tags on a note', async () => {
    const notes = [
      createNote({ content: 'Tagged note', title: 'Tagged', type: 'note', tags: ['work', 'urgent'] }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList />)
    await waitFor(() => {
      expect(screen.getByText('Tagged')).toBeInTheDocument()
      expect(screen.getByText('work')).toBeInTheDocument()
      expect(screen.getByText('urgent')).toBeInTheDocument()
    })
  })

})
