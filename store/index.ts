import { create } from 'zustand'
import type { Note, NoteType } from '@/lib/types'

const MAX_CACHED_NOTES = 200

interface AppState {
  notes: Note[]
  filterType: NoteType | 'all'
  loading: boolean
  cursor: string | null
  hasMore: boolean
  setNotes: (notes: Note[]) => void
  setFilterType: (type: NoteType | 'all') => void
  setLoading: (loading: boolean) => void
  addNote: (note: Note) => void
  removeNote: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  setCursor: (cursor: string | null) => void
  setHasMore: (hasMore: boolean) => void
  appendNotes: (notes: Note[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  notes: [],
  filterType: 'all',
  loading: false,
  cursor: null,
  hasMore: true,
  setNotes: (notes) => set({ notes: notes.slice(0, MAX_CACHED_NOTES) }),
  setFilterType: (filterType) => set({ filterType }),
  setLoading: (loading) => set({ loading }),
  addNote: (note) => set((state) => ({
    notes: [note, ...state.notes].slice(0, MAX_CACHED_NOTES),
  })),
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
  })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  })),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  appendNotes: (notes) => set((state) => ({
    notes: [...state.notes, ...notes].slice(0, MAX_CACHED_NOTES),
    cursor: notes.length > 0 ? notes[notes.length - 1].createdAt : state.cursor,
  })),
}))
