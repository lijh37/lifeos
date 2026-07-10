import { create } from 'zustand'
import type { Note } from '@/lib/types'

const MAX_CACHED_NOTES = 500

// ─── Notes store ──────────────────────────────────────────────────────────

interface AppState {
  notes: Note[]
  initialLoading: boolean
  setNotes: (notes: Note[]) => void
  setInitialLoading: (loading: boolean) => void
  addNote: (note: Note) => void
  removeNote: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
}

export const useAppStore = create<AppState>((set) => ({
  notes: [],
  initialLoading: true,
  setNotes: (notes) => set({ notes: notes.slice(0, MAX_CACHED_NOTES) }),
  setInitialLoading: (initialLoading) => set({ initialLoading }),
  addNote: (note) => set((state) => ({
    notes: [note, ...state.notes].slice(0, MAX_CACHED_NOTES),
  })),
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
  })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  })),
}))
