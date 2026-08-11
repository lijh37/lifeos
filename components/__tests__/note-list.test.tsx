import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { NoteList } from '@/components/note-list'
import { useAppStore } from '@/store'
import type { Note } from '@/lib/types'

// Mock next/navigation
const mockRouter = { push: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))
import { useSearchParams } from 'next/navigation'

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

// Helper to control the mocked useSearchParams value per test
function mockSearchParams(query: string = '') {
  vi.mocked(useSearchParams).mockReset()
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(query) as unknown as ReturnType<typeof useSearchParams>,
  )
}

describe('NoteList', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      notes: [],
      initialLoading: false,
    })
    mockFetch.mockReset()
    mockRouter.replace.mockReset()
    mockSearchParams()
    // Reset the persisted view preference so tests start in the default card view
    window.localStorage.clear()
    // Default: return empty results for notes + tags to prevent crashes
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [], tags: [] }),
    })
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

  it('should render a single note with title', async () => {
    const notes = [
      createNote({ content: 'Solo note', type: 'note', title: 'Solo' }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText('Solo')).toBeInTheDocument()
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

  it('switches to compact view and persists the preference', async () => {
    const notes = [
      createNote({
        content: 'Summary text',
        type: 'note',
        title: 'Dense Note',
        tags: ['工作'],
      }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList />)

    // Default card view shows the summary and tags
    await waitFor(() => {
      expect(screen.getByText('Dense Note')).toBeInTheDocument()
    })
    expect(screen.getByText('Summary text')).toBeInTheDocument()
    expect(screen.getByText('工作')).toBeInTheDocument()

    // Switch to compact view
    fireEvent.click(screen.getByRole('button', { name: '紧凑列表' }))

    // Compact rows: title kept, summary and tags hidden
    await waitFor(() => {
      expect(screen.queryByText('Summary text')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('工作')).not.toBeInTheDocument()
    expect(screen.getByText('Dense Note')).toBeInTheDocument()
    expect(window.localStorage.getItem('note_list_view')).toBe('compact')
  })

  it('keeps the selection when switching views', async () => {
    const notes = [
      createNote({ type: 'note', title: 'Note A' }),
      createNote({ type: 'note', title: 'Note B' }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText('Note A')).toBeInTheDocument()
    })

    // Select all in card view
    fireEvent.click(screen.getByText('全选'))
    expect(screen.getByText('已选 2 项')).toBeInTheDocument()

    // Switch to compact — selection survives the view change
    fireEvent.click(screen.getByRole('button', { name: '紧凑列表' }))
    expect(screen.getByText('已选 2 项')).toBeInTheDocument()
  })

  it('restores the tag filter from the URL after returning from detail', async () => {
    const tagged = createNote({ title: 'Tagged Note', tags: ['工作'] })
    const other = createNote({ title: 'Other Note', tags: ['生活'] })
    // Notes already cached in the store (as if returning from the detail page)
    useAppStore.setState({ notes: [tagged, other], initialLoading: false })
    // URL carries the active tag filter
    mockSearchParams('tag=工作')

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText('Tagged Note')).toBeInTheDocument()
    })
    expect(screen.queryByText('Other Note')).not.toBeInTheDocument()
  })

  it('writes the selected tag to the URL so back-navigation restores the filter', async () => {
    useAppStore.setState({
      notes: [createNote({ title: 'N1' })],
      initialLoading: false,
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [], tags: [{ name: '工作', count: 1 }] }),
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText('工作')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('工作'))

    // URLSearchParams.toString() 对中文做百分号编码（与浏览器 URL 一致）
    expect(mockRouter.replace).toHaveBeenCalledWith('/notes?tag=%E5%B7%A5%E4%BD%9C', { scroll: false })
  })

  it('clears the tag from the URL when selecting 全部', async () => {
    mockSearchParams('tag=工作')
    useAppStore.setState({
      notes: [createNote({ title: 'N1', tags: ['工作'] })],
      initialLoading: false,
    })

    render(<NoteList />)

    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('全部'))

    expect(mockRouter.replace).toHaveBeenCalledWith('/notes', { scroll: false })
  })
})
