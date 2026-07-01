import { create } from 'zustand'
import type { Note } from '@/lib/types'

const MAX_CACHED_NOTES = 500

// ─── Notes store (cursor-paginated cache) ──────────────────────────────────

interface AppState {
  notes: Note[]
  loading: boolean
  cursor: string | null
  hasMore: boolean
  setNotes: (notes: Note[]) => void
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
  loading: false,
  cursor: null,
  hasMore: true,
  setNotes: (notes) => set({ notes: notes.slice(0, MAX_CACHED_NOTES) }),
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

// ─── UI store (shared cross-page state) ────────────────────────────────────

interface UIState {
  /** Global search query (persisted across tab navigation) */
  globalSearchQuery: string
  setGlobalSearchQuery: (q: string) => void
  /** Mobile sidebar / sheet visibility */
  isMobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  globalSearchQuery: '',
  setGlobalSearchQuery: (globalSearchQuery) => set({ globalSearchQuery }),
  isMobileMenuOpen: false,
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
}))
