import { create } from 'zustand'
import type { Note } from '@/lib/types'

const MAX_CACHED_NOTES = 500

// ─── Notes store (cursor-paginated cache) ──────────────────────────────────

interface AppState {
  notes: Note[]
  initialLoading: boolean
  loadingMore: boolean
  cursor: string | null
  hasMore: boolean
  setNotes: (notes: Note[]) => void
  setInitialLoading: (loading: boolean) => void
  setLoadingMore: (loading: boolean) => void
  addNote: (note: Note) => void
  removeNote: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  setCursor: (cursor: string | null) => void
  setHasMore: (hasMore: boolean) => void
  appendNotes: (notes: Note[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  notes: [],
  initialLoading: true,
  loadingMore: false,
  cursor: null,
  hasMore: true,
  setNotes: (notes) => set({ notes: notes.slice(0, MAX_CACHED_NOTES) }),
  setInitialLoading: (initialLoading) => set({ initialLoading }),
  setLoadingMore: (loadingMore) => set({ loadingMore }),
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
  appendNotes: (notes) => set((state) => {
    const existingIds = new Set(state.notes.map(n => n.id))
    const newNotes = notes.filter(n => !existingIds.has(n.id))
    return { notes: [...state.notes, ...newNotes].slice(0, MAX_CACHED_NOTES) }
  }),
}))

// ─── UI store (shared cross-page state) ────────────────────────────────────

interface UIState {
  /** Mobile sidebar / sheet visibility */
  isMobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
}))
