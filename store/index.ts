import { create } from 'zustand'
import type { Note, NoteType } from '@/lib/types'

interface AppState {
  notes: Note[]
  filterType: NoteType | 'all'
  loading: boolean
  setNotes: (notes: Note[]) => void
  setFilterType: (type: NoteType | 'all') => void
  setLoading: (loading: boolean) => void
  addNote: (note: Note) => void
  removeNote: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
}

export const useAppStore = create<AppState>((set) => ({
  notes: [],
  filterType: 'all',
  loading: false,
  setNotes: (notes) => set({ notes }),
  setFilterType: (filterType) => set({ filterType }),
  setLoading: (loading) => set({ loading }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
  })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  })),
}))
