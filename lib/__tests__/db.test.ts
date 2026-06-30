// IMPORTANT: Set env BEFORE importing db
process.env.DATABASE_URL = ':memory:'

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDB, createNote, getNotes, getNote, updateNote, deleteNote, getNotesCountByType } from '@/lib/db'
import type { Note } from '@/lib/types'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
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

describe('Database - Notes', () => {
  beforeAll(async () => {
    await initDB()
  })

  beforeEach(async () => {
    const { getClient } = await import('@/lib/db')
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM notes')
  })

  it('should create and retrieve a note', async () => {
    const note = makeNote()
    await createNote(note)
    const notes = await getNotes()
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe(note.id)
    expect(notes[0].content).toBe('test content')
  })

  it('should get a single note by id', async () => {
    const note = makeNote()
    await createNote(note)
    const found = await getNote(note.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(note.id)
  })

  it('should return null for non-existent note', async () => {
    const found = await getNote('non-existent')
    expect(found).toBeNull()
  })

  it('should update a note', async () => {
    const note = makeNote()
    await createNote(note)
    await updateNote(note.id, { content: 'updated', title: 'New Title', done: true })
    const found = await getNote(note.id)
    expect(found!.content).toBe('updated')
    expect(found!.title).toBe('New Title')
    expect(found!.done).toBe(true)
  })

  it('should delete a note', async () => {
    const note = makeNote()
    await createNote(note)
    await deleteNote(note.id)
    const notes = await getNotes()
    expect(notes).toHaveLength(0)
  })

  it('should filter by type', async () => {
    await createNote(makeNote({ type: 'note' }))
    await createNote(makeNote({ type: 'note' }))

    const notes = await getNotes('note')
    expect(notes.length).toBeGreaterThanOrEqual(2)
    expect(notes[0].type).toBe('note')
  })

  it('should return counts by type', async () => {
    await createNote(makeNote({ type: 'note' }))

    const count = await getNotesCountByType('note')
    expect(count).toBeGreaterThanOrEqual(1)
  })

  it('should handle tags as JSON array', async () => {
    const note = makeNote({ tags: ['work', 'meeting', 'important'] })
    await createNote(note)
    const found = await getNote(note.id)
    expect(found!.tags).toEqual(['work', 'meeting', 'important'])
  })
})

describe('Database - Habits', () => {
  beforeAll(async () => {
    await initDB()
  })

  beforeEach(async () => {
    const { getClient } = await import('@/lib/db')
    await getClient().execute('DELETE FROM habits')
    await getClient().execute('DELETE FROM habit_completions')
  })

  it('should create and list habits', async () => {
    const { createHabit, getHabits } = await import('@/lib/db')
    const habit = {
      id: crypto.randomUUID(),
      name: '每天跑步',
      description: '跑5公里',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)
    const habits = await getHabits()
    expect(habits).toHaveLength(1)
    expect(habits[0].name).toBe('每天跑步')
  })

  it('should toggle completion', async () => {
    const { createHabit, toggleCompletion, getTodayCompletions } = await import('@/lib/db')
    const habit = {
      id: crypto.randomUUID(),
      name: '阅读',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)

    const today = new Date().toISOString().slice(0, 10)
    const completed = await toggleCompletion(habit.id, today)
    expect(completed).toBe(true)

    const completions = await getTodayCompletions()
    expect(completions[habit.id]).toBe(true)
  })

  it('should toggle completion off', async () => {
    const { createHabit, toggleCompletion, getTodayCompletions } = await import('@/lib/db')
    const habit = {
      id: crypto.randomUUID(),
      name: '冥想',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)

    const today = new Date().toISOString().slice(0, 10)
    await toggleCompletion(habit.id, today) // toggle on
    const completed = await toggleCompletion(habit.id, today) // toggle off
    expect(completed).toBe(false)
  })

  it('should delete habit and its completions', async () => {
    const { createHabit, toggleCompletion, deleteHabit, getHabits } = await import('@/lib/db')
    const habit = {
      id: crypto.randomUUID(),
      name: '写作',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)
    await toggleCompletion(habit.id, new Date().toISOString().slice(0, 10))
    await deleteHabit(habit.id)
    const habits = await getHabits()
    expect(habits).toHaveLength(0)

    // Also verify completions deleted
    const { getTodayCompletions } = await import('@/lib/db')
    const completions = await getTodayCompletions()
    expect(completions[habit.id]).toBeUndefined()
  })
})

describe('Database - Budgets', () => {
  beforeAll(async () => {
    await initDB()
  })

  beforeEach(async () => {
    const { getClient } = await import('@/lib/db')
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM notes')
  })

  it('should create and get a budget', async () => {
    const { upsertBudget, getBudget } = await import('@/lib/db')
    const budget = await upsertBudget('2026-06', { fixedBudget: 10000, variableBudget: 5000 })
    expect(budget.month).toBe('2026-06')
    expect(budget.fixedBudget).toBe(10000)
    expect(budget.variableBudget).toBe(5000)

    const found = await getBudget('2026-06')
    expect(found).not.toBeNull()
    expect(found!.fixedBudget).toBe(10000)
  })

  it('should update an existing budget', async () => {
    const { upsertBudget, getBudget } = await import('@/lib/db')
    await upsertBudget('2026-06', { fixedBudget: 10000 })
    await upsertBudget('2026-06', { fixedBudget: 15000, fixedActual: 12000 })

    const found = await getBudget('2026-06')
    expect(found!.fixedBudget).toBe(15000)
    expect(found!.fixedActual).toBe(12000)
  })

  it('should list all budgets', async () => {
    const { upsertBudget, getBudgets } = await import('@/lib/db')
    await upsertBudget('2026-06', { fixedBudget: 10000 })
    await upsertBudget('2026-07', { fixedBudget: 20000 })

    const budgets = await getBudgets()
    expect(budgets).toHaveLength(2)
  })
})

describe('Database - Search and Tags', () => {
  beforeAll(async () => {
    await initDB()
  })

  beforeEach(async () => {
    const { getClient } = await import('@/lib/db')
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM notes')
  })

  it('should search notes by content', async () => {
    const { createNote, searchNotes } = await import('@/lib/db')
    await createNote(makeNote({ content: 'This is about machine learning', tags: ['AI', 'tech'] }))
    await createNote(makeNote({ content: 'Shopping list: milk, bread', tags: ['life'] }))

    const results = await searchNotes('machine')
    expect(results).toHaveLength(1)
    expect(results[0].content).toContain('machine learning')
  })

  it('should search notes by title', async () => {
    const { createNote, searchNotes } = await import('@/lib/db')
    await createNote(makeNote({ content: 'details', title: 'Project Plan', tags: [] }))

    const results = await searchNotes('Project')
    expect(results).toHaveLength(1)
  })

  it('should collect all tags with counts', async () => {
    const { createNote, getAllTags } = await import('@/lib/db')
    await createNote(makeNote({ tags: ['work', 'urgent'] }))
    await createNote(makeNote({ tags: ['work', 'personal'] }))
    await createNote(makeNote({ tags: ['personal'] }))

    const tags = await getAllTags()
    const workTag = tags.find(t => t.name === 'work')
    const personalTag = tags.find(t => t.name === 'personal')
    expect(workTag!.count).toBe(2)
    expect(personalTag!.count).toBe(2)

    // Should be sorted by count desc
    expect(tags[0].count).toBeGreaterThanOrEqual(tags[1].count)
  })
})
