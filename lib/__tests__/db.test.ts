// IMPORTANT: Clear Turso env + set a temp FILE db BEFORE importing db.
// NOTE: libSQL's db.transaction() is unsupported on `:memory:` in this build
// (tx.commit() throws SQLITE_ERROR), so tests that exercise transactional
// helpers (syncNoteTags/renameTag/deleteTag/deleteHabit) must use a file DB.
// E2E and routes tests use the same file-DB approach.
delete process.env.TURSO_DATABASE_URL
process.env.DATABASE_URL = 'file:./.db-test.sqlite'

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import fs from 'node:fs'
import { createNote, getNotes, getNote, updateNote, deleteNote, getClient, createHabit, getHabits, toggleCompletion, getTodayCompletions, deleteHabit, upsertBudget, getBudget, getBudgets, searchNotes, getAllTags, renameTag, deleteTag, migrate, listWeightLogs, upsertWeightLog, deleteWeightLog, getHabitsDashboard } from '@/lib/db'
import { localDateStr } from '@/lib/utils'
import type { Note } from '@/lib/types'

// Clean up the temp file DB after all tests in this file.
afterAll(async () => {
  try {
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM notes')
  } catch { /* ignore */ }
  try { fs.unlinkSync('./.db-test.sqlite') } catch { /* ignore */ }
})

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
    pinned: overrides.pinned ?? false,
  }
}

describe('Database - Notes', () => {
  beforeAll(async () => {
    await migrate(getClient())
  })

  beforeEach(async () => {
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

    const notes = await getNotes()
    expect(notes.length).toBeGreaterThanOrEqual(2)
    expect(notes[0].type).toBe('note')
  })

  it('should handle tags', async () => {
    const note = makeNote({ tags: ['work', 'meeting', 'important'] })
    await createNote(note)
    const found = await getNote(note.id)
    expect(found!.tags).toEqual(expect.arrayContaining(['work', 'meeting', 'important']))
  })
})

describe('Database - Habits', () => {
  beforeAll(async () => {
    await migrate(getClient())
  })

  beforeEach(async () => {
    await getClient().execute('DELETE FROM habits')
    await getClient().execute('DELETE FROM habit_completions')
  })

  it('should create and list habits', async () => {
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
    const habit = {
      id: crypto.randomUUID(),
      name: '阅读',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)

    const today = localDateStr()
    const completed = await toggleCompletion(habit.id, today)
    expect(completed).toBe(true)

    const completions = await getTodayCompletions()
    expect(completions[habit.id]).toBe(true)
  })

  it('should toggle completion off', async () => {
    const habit = {
      id: crypto.randomUUID(),
      name: '冥想',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)

    const today = localDateStr()
    await toggleCompletion(habit.id, today) // toggle on
    const completed = await toggleCompletion(habit.id, today) // toggle off
    expect(completed).toBe(false)
  })

  it('should delete habit and its completions', async () => {
    const habit = {
      id: crypto.randomUUID(),
      name: '写作',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)
    await toggleCompletion(habit.id, localDateStr())
    await deleteHabit(habit.id)
    const habits = await getHabits()
    expect(habits).toHaveLength(0)

    // Also verify completions deleted
    const completions = await getTodayCompletions()
    expect(completions[habit.id]).toBeUndefined()
  })

  it('should include recentDays entry for a today completion (isBackfilled false)', async () => {
    const habit = {
      id: crypto.randomUUID(),
      name: '阅读',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)
    const today = localDateStr()
    await toggleCompletion(habit.id, today)

    const dash = await getHabitsDashboard()
    const recent = dash.recentDays[habit.id]
    expect(recent).toHaveLength(3)
    // 新的在前：第一条是今天
    expect(recent[0]).toEqual({ date: today, completed: true, isBackfilled: false })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(recent[1].date).toBe(localDateStr(yesterday))
    expect(recent[1].completed).toBe(false)
  })

  it('should mark a yesterday completion as backfilled in recentDays', async () => {
    const habit = {
      id: crypto.randomUUID(),
      name: '冥想',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = localDateStr(yesterday)
    await toggleCompletion(habit.id, yesterdayStr)

    const dash = await getHabitsDashboard()
    const recent = dash.recentDays[habit.id]
    expect(recent).toHaveLength(3)
    expect(recent[1]).toEqual({ date: yesterdayStr, completed: true, isBackfilled: true })
  })

  it('should include 3 recentDays entries (newest first) for a habit without completions', async () => {
    const habit = {
      id: crypto.randomUUID(),
      name: '写作',
      description: '',
      frequency: 'daily' as const,
      createdAt: new Date().toISOString(),
    }
    await createHabit(habit)

    const dash = await getHabitsDashboard()
    const recent = dash.recentDays[habit.id]
    expect(recent).toHaveLength(3)
    expect(recent.every((e) => !e.completed)).toBe(true)
    expect(recent.every((e) => !e.isBackfilled)).toBe(true)
    // 顺序：今天 → 昨天 → 前天
    const today = localDateStr()
    expect(recent[0].date).toBe(today)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(recent[1].date).toBe(localDateStr(yesterday))
    const before = new Date()
    before.setDate(before.getDate() - 2)
    expect(recent[2].date).toBe(localDateStr(before))
  })
})

describe('Database - Budgets', () => {
  beforeAll(async () => {
    await migrate(getClient())
  })

  beforeEach(async () => {
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM notes')
  })

  it('should create and get a budget', async () => {
    const budget = await upsertBudget('2026-06', { fixedBudget: 10000, variableBudget: 5000 })
    expect(budget.month).toBe('2026-06')
    expect(budget.fixedBudget).toBe(10000)
    expect(budget.variableBudget).toBe(5000)

    const found = await getBudget('2026-06')
    expect(found).not.toBeNull()
    expect(found!.fixedBudget).toBe(10000)
  })

  it('should update an existing budget', async () => {
    await upsertBudget('2026-06', { fixedBudget: 10000 })
    await upsertBudget('2026-06', { fixedBudget: 15000, fixedActual: 12000 })

    const found = await getBudget('2026-06')
    expect(found!.fixedBudget).toBe(15000)
    expect(found!.fixedActual).toBe(12000)
  })

  it('should list all budgets', async () => {
    await upsertBudget('2026-06', { fixedBudget: 10000 })
    await upsertBudget('2026-07', { fixedBudget: 20000 })

    const budgets = await getBudgets()
    expect(budgets).toHaveLength(2)
  })
})

describe('Database - Search and Tags', () => {
  beforeAll(async () => {
    await migrate(getClient())
  })

  beforeEach(async () => {
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM notes')
  })

  it('should search notes by content', async () => {
    await createNote(makeNote({ content: 'This is about machine learning', tags: ['AI', 'tech'] }))
    await createNote(makeNote({ content: 'Shopping list: milk, bread', tags: ['life'] }))

    const results = await searchNotes('machine')
    expect(results).toHaveLength(1)
    expect(results[0].content).toContain('machine learning')
  })

  it('should search notes by title', async () => {
    await createNote(makeNote({ content: 'details', title: 'Project Plan', tags: [] }))

    const results = await searchNotes('Project')
    expect(results).toHaveLength(1)
  })

  it('should collect all tags with counts', async () => {
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

  it('should rename a tag', async () => {
    const note = makeNote({ tags: ['work', 'urgent'] })
    await createNote(note)

    await renameTag('work', 'job')
    const tags = await getAllTags()
    expect(tags.find(t => t.name === 'work')).toBeUndefined()
    expect(tags.find(t => t.name === 'job')!.count).toBe(1)
    // urgent should be unchanged
    expect(tags.find(t => t.name === 'urgent')!.count).toBe(1)

    const updated = await getNote(note.id)
    expect(updated!.tags).toContain('job')
    expect(updated!.tags).not.toContain('work')
    expect(updated!.tags).toContain('urgent')
  })

  it('should merge tags when renaming to existing name', async () => {
    const note1 = makeNote({ tags: ['work', 'urgent'] })
    const note2 = makeNote({ tags: ['important', 'urgent'] })
    await createNote(note1)
    await createNote(note2)

    // Merge 'important' into 'urgent'
    await renameTag('important', 'urgent')
    const tags = await getAllTags()
    const urgentTag = tags.find(t => t.name === 'urgent')
    expect(urgentTag!.count).toBe(2) // appears in both notes
    expect(tags.find(t => t.name === 'important')).toBeUndefined()

    const updated1 = await getNote(note1.id)
    expect(updated1!.tags).toEqual(expect.arrayContaining(['work', 'urgent']))
    const updated2 = await getNote(note2.id)
    expect(updated2!.tags).toEqual(['urgent'])
  })

  it('should not create duplicates when merging tags', async () => {
    // Note already has both 'work' and 'job' — renaming 'work' → 'job' should not create [job, job]
    const note = makeNote({ tags: ['work', 'job', 'urgent'] })
    await createNote(note)

    await renameTag('work', 'job')
    const updated = await getNote(note.id)
    expect(updated!.tags).toEqual(['job', 'urgent']) // no duplicates
  })

  it('should delete a tag', async () => {
    const note = makeNote({ tags: ['work', 'urgent', 'personal'] })
    await createNote(note)

    await deleteTag('urgent')
    const tags = await getAllTags()
    expect(tags.find(t => t.name === 'urgent')).toBeUndefined()
    expect(tags.find(t => t.name === 'work')!.count).toBe(1)
    expect(tags.find(t => t.name === 'personal')!.count).toBe(1)

    const updated = await getNote(note.id)
    expect(updated!.tags).toEqual(['personal', 'work'])
  })

  it('should delete non-existent tag without error', async () => {
    await expect(deleteTag('nonexistent')).resolves.toBeUndefined()
  })
})

describe('Database - Weight', () => {
  beforeAll(async () => {
    await migrate(getClient())
  })

  beforeEach(async () => {
    await getClient().execute('DELETE FROM weight_logs')
  })

  it('should insert a weight log and list it', async () => {
    const log = await upsertWeightLog({
      person: 'me',
      date: '2026-01-15',
      weight: 70.5,
      note: '晨起',
    })
    expect(log.person).toBe('me')
    expect(log.date).toBe('2026-01-15')
    expect(log.weight).toBe(70.5)
    expect(log.note).toBe('晨起')
    expect(log.id).toBeDefined()

    const logs = await listWeightLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].id).toBe(log.id)
  })

  it('should overwrite same person + same date', async () => {
    const first = await upsertWeightLog({ person: 'me', date: '2026-01-15', weight: 70.5 })
    const second = await upsertWeightLog({ person: 'me', date: '2026-01-15', weight: 69.8, note: '更新' })

    expect(second.id).toBe(first.id)
    const logs = await listWeightLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].weight).toBe(69.8)
    expect(logs[0].note).toBe('更新')
  })

  it('should keep two persons independent on the same date', async () => {
    await upsertWeightLog({ person: 'me', date: '2026-01-15', weight: 70.5 })
    await upsertWeightLog({ person: 'her', date: '2026-01-15', weight: 52.0 })

    const logs = await listWeightLogs()
    expect(logs).toHaveLength(2)
    const me = logs.find(l => l.person === 'me')
    const her = logs.find(l => l.person === 'her')
    expect(me!.weight).toBe(70.5)
    expect(her!.weight).toBe(52.0)
  })

  it('should list sorted by person then date asc', async () => {
    await upsertWeightLog({ person: 'me', date: '2026-02-01', weight: 71 })
    await upsertWeightLog({ person: 'her', date: '2026-01-20', weight: 52.5 })
    await upsertWeightLog({ person: 'me', date: '2026-01-15', weight: 70.5 })
    await upsertWeightLog({ person: 'her', date: '2026-01-10', weight: 53 })

    const logs = await listWeightLogs()
    expect(logs.map(l => `${l.person}:${l.date}`)).toEqual([
      'her:2026-01-10',
      'her:2026-01-20',
      'me:2026-01-15',
      'me:2026-02-01',
    ])
  })

  it('should delete a weight log', async () => {
    const log = await upsertWeightLog({ person: 'me', date: '2026-01-15', weight: 70.5 })
    await deleteWeightLog(log.id)
    const logs = await listWeightLogs()
    expect(logs).toHaveLength(0)
  })
})
