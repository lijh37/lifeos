import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store'
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
    pinned: overrides.pinned ?? false,
  }
}

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      notes: [],
      initialLoading: false,
    })
  })

  it('should start with empty state', () => {
    const state = useAppStore.getState()
    expect(state.notes).toEqual([])
    expect(state.initialLoading).toBe(false)
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
    expect(updated.id).toBe('1')
    expect(updated.type).toBe('note')
  })

  it('should update non-existent note without error', () => {
    useAppStore.getState().setNotes([makeNote('1')])
    expect(() => {
      useAppStore.getState().updateNote('999', { content: 'ghost' })
    }).not.toThrow()
    expect(useAppStore.getState().notes).toHaveLength(1)
  })

  it('should remove non-existent note without error', () => {
    useAppStore.getState().setNotes([makeNote('1')])
    expect(() => {
      useAppStore.getState().removeNote('999')
    }).not.toThrow()
    expect(useAppStore.getState().notes).toHaveLength(1)
  })

  it('should handle remove from empty list without error', () => {
    expect(() => {
      useAppStore.getState().removeNote('1')
    }).not.toThrow()
  })

  it('should set initial loading state', () => {
    expect(useAppStore.getState().initialLoading).toBe(false)
    useAppStore.getState().setInitialLoading(true)
    expect(useAppStore.getState().initialLoading).toBe(true)
    useAppStore.getState().setInitialLoading(false)
    expect(useAppStore.getState().initialLoading).toBe(false)
  })

  it('should cap notes at MAX_CACHED_NOTES on addNote', () => {
    const manyNotes = Array.from({ length: 500 }, (_, i) => makeNote(String(i)))
    useAppStore.getState().setNotes(manyNotes)
    useAppStore.getState().addNote(makeNote('overflow'))
    expect(useAppStore.getState().notes).toHaveLength(500)
    expect(useAppStore.getState().notes[0].id).toBe('overflow')
  })
})
