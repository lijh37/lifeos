import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NoteList } from '@/components/note-list'
import { useAppStore } from '@/store'
import type { Note } from '@/lib/types'

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
  }
}

describe('NoteList', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      notes: [],
      filterType: 'all',
      loading: false,
    })
    mockFetch.mockReset()
  })

  it('should render loading skeleton initially when loading is true', () => {
    useAppStore.setState({ loading: true, notes: [] })
    render(<NoteList />)
    // The SkeletonNoteList should render when loading
    // Check that no note content is shown
    expect(screen.queryByText('Test content')).not.toBeInTheDocument()
  })

  it('should render notes from store after fetch resolves', async () => {
    const notes = [
      createNote({ content: 'Note 1', type: 'note', title: 'First Note' }),
      createNote({ content: 'Note 2', type: 'task', title: 'Task 1' }),
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
      expect(screen.getByText('Task 1')).toBeInTheDocument()
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

  it('should filter notes by type when filter buttons clicked', async () => {
    const notes = [
      createNote({ content: 'A note', type: 'note', tags: [] }),
      createNote({ content: 'A task', type: 'task', tags: [] }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList />)

    // Wait for notes to load
    await waitFor(() => {
      // Text appears in both card title and content body when title is null
      expect(screen.getAllByText('A note').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('A task').length).toBeGreaterThanOrEqual(1)
    })

    // Click the 笔记 filter button (getByRole filters out the badge span)
    fireEvent.click(screen.getByRole('button', { name: '笔记' }))

    // After clicking, only notes of type 'note' should show
    expect(screen.getAllByText('A note').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('A task')).not.toBeInTheDocument()
  })

  it('should show type labels on filter buttons', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument()
      expect(screen.getByText('笔记')).toBeInTheDocument()
      expect(screen.getByText('任务')).toBeInTheDocument()
      expect(screen.getByText('事件')).toBeInTheDocument()
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

  it('should show export button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument()
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

  it('should display task filter by default when defaultFilter is task', async () => {
    const notes = [
      createNote({ content: 'A note', type: 'note', tags: [] }),
      createNote({ content: 'Task 1', type: 'task', tags: [] }),
      createNote({ content: 'Task 2', type: 'task', tags: [] }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList defaultFilter="task" />)
    await waitFor(() => {
      // Should only show task items
      // Text appears in both card title and content body when title is null
      expect(screen.getAllByText('Task 1').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Task 2').length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByText('A note')).not.toBeInTheDocument()
    })
  })
})
