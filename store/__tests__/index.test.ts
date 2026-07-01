import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, useUIStore } from '@/store'
import type { Note } from '@/lib/types'

// Helper to create test notes
function makeNote(id: string, overrides: Partial<Note> = {}): Note {
  return {
    id,
    content: 'test content',
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

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      notes: [],
      loading: false,
      cursor: null,
      hasMore: true,
    })
  })

  it('should start with empty state', () => {
    const state = useAppStore.getState()
    expect(state.notes).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.cursor).toBeNull()
    expect(state.hasMore).toBe(true)
  })

  it('should set notes', () => {
    const notes = [makeNote('1'), makeNote('2')]
    useAppStore.getState().setNotes(notes)
    expect(useAppStore.getState().notes).toHaveLength(2)
  })

  it('should enforce MAX_CACHED_NOTES', () => {
    const notes = Array.from({ length: 501 }, (_, i) => makeNote(String(i)))
    useAppStore.getState().setNotes(notes)
    expect(useAppStore.getState().notes).toHaveLength(500)
  })

  it('should add a note to the beginning', () => {
    useAppStore.getState().addNote(makeNote('1'))
    useAppStore.getState().addNote(makeNote('2'))
    const notes = useAppStore.getState().notes
    expect(notes).toHaveLength(2)
    expect(notes[0].id).toBe('2')
    expect(notes[1].id).toBe('1')
  })

  it('should remove a note by id', () => {
    useAppStore.getState().setNotes([makeNote('1'), makeNote('2'), makeNote('3')])
    useAppStore.getState().removeNote('2')
    const notes = useAppStore.getState().notes
    expect(notes).toHaveLength(2)
    expect(notes.find((n) => n.id === '2')).toBeUndefined()
  })

  it('should update a note', () => {
    const note = makeNote('1', { content: 'original' })
    useAppStore.getState().setNotes([note])
    useAppStore.getState().updateNote('1', { content: 'updated', done: true })
    const updated = useAppStore.getState().notes[0]
    expect(updated.content).toBe('updated')
    expect(updated.done).toBe(true)
    // original fields should remain
    expect(updated.id).toBe('1')
    expect(updated.type).toBe('note')
  })

  it('should set cursor and hasMore', () => {
    useAppStore.getState().setCursor('abc123')
    expect(useAppStore.getState().cursor).toBe('abc123')

    useAppStore.getState().setHasMore(false)
    expect(useAppStore.getState().hasMore).toBe(false)
  })

  it('should append notes and update cursor', () => {
    const note1 = makeNote('1', { createdAt: '2024-01-01T00:00:00.000Z' })
    const note2 = makeNote('2', { createdAt: '2024-01-02T00:00:00.000Z' })
    useAppStore.getState().setNotes([note1])
    useAppStore.getState().appendNotes([note2])
    const state = useAppStore.getState()
    expect(state.notes).toHaveLength(2)
    expect(state.notes[0].id).toBe('1')
    expect(state.notes[1].id).toBe('2')
    expect(state.cursor).toBe('2024-01-02T00:00:00.000Z')
  })

  it('should handle append with empty array', () => {
    useAppStore.getState().setCursor('existing-cursor')
    useAppStore.getState().appendNotes([])
    const state = useAppStore.getState()
    expect(state.notes).toHaveLength(0)
    expect(state.cursor).toBe('existing-cursor')
  })
})

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      globalSearchQuery: '',
      isMobileMenuOpen: false,
    })
  })

  it('should have default values', () => {
    const state = useUIStore.getState()
    expect(state.globalSearchQuery).toBe('')
    expect(state.isMobileMenuOpen).toBe(false)
  })

  it('should set search query', () => {
    useUIStore.getState().setGlobalSearchQuery('test')
    expect(useUIStore.getState().globalSearchQuery).toBe('test')
  })

  it('should set mobile menu open', () => {
    useUIStore.getState().setMobileMenuOpen(true)
    expect(useUIStore.getState().isMobileMenuOpen).toBe(true)

    useUIStore.getState().setMobileMenuOpen(false)
    expect(useUIStore.getState().isMobileMenuOpen).toBe(false)
  })
})
