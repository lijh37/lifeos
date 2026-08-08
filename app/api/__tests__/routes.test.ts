// IMPORTANT: Clear Turso env BEFORE importing db.
// Use a temp FILE database (not :memory:) because invoking the route handlers
// recreates the in-memory connection, dropping tables between hooks. A file DB
// persists across all getClient() calls within the test run.
delete process.env.TURSO_DATABASE_URL
process.env.DATABASE_URL = 'file:./.routes-test.db'

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { rmSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { getClient, migrate } from '@/lib/db'

import { GET as notesGET, POST as notesPOST, DELETE as notesDELETE } from '@/app/api/notes/route'
import { POST as batchPOST } from '@/app/api/notes/batch/route'
import { GET as tagsGET, PATCH as tagsPATCH, DELETE as tagsDELETE } from '@/app/api/tags/route'
import { GET as budgetsGET, POST as budgetsPOST } from '@/app/api/budgets/route'
import { GET as habitsGET, POST as habitsPOST } from '@/app/api/habits/route'
import { GET as weightGET, POST as weightPOST, DELETE as weightDELETE } from '@/app/api/weight/route'
import { GET as exportGET } from '@/app/api/export/route'
import { GET as backupGET } from '@/app/api/backup/route'

function postReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body) })
}

describe('API routes', () => {
  beforeAll(async () => {
    await migrate(getClient())
  })

  afterAll(() => {
    try { rmSync('./.routes-test.db', { force: true }) } catch { /* ignore */ }
  })

  beforeEach(async () => {
    // migrate() is idempotent (checks _migrations), so re-running is cheap and safe.
    await migrate(getClient())
    await getClient().execute('DELETE FROM note_tags')
    await getClient().execute('DELETE FROM tags')
    await getClient().execute('DELETE FROM attachments')
    await getClient().execute('DELETE FROM notes')
    await getClient().execute('DELETE FROM habits')
    await getClient().execute('DELETE FROM habit_completions')
    await getClient().execute('DELETE FROM weight_logs')
    await getClient().execute('DELETE FROM budgets')
  })

  afterEach(() => {
    // Ensure auth env never leaks between tests.
    delete process.env.APP_PASSWORD
  })

  describe('notes', () => {
    it('1. POST creates a note and GET returns it', async () => {
      const res = await notesPOST(postReq('http://localhost/api/notes', { content: 'hello world' }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.note).toBeDefined()
      expect(data.note.content).toBe('hello world')

      const listRes = await notesGET(new NextRequest('http://localhost/api/notes'))
      expect(listRes.status).toBe(200)
      const list = await listRes.json()
      expect(list.notes).toHaveLength(1)
      expect(list.notes[0].id).toBe(data.note.id)
    })

    it('2. POST with invalid type returns 400', async () => {
      const res = await notesPOST(postReq('http://localhost/api/notes', { content: 'x', type: 'bogus' }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('3. GET search ?q= returns matching notes', async () => {
      await notesPOST(postReq('http://localhost/api/notes', { content: 'apple pie' }))
      await notesPOST(postReq('http://localhost/api/notes', { content: 'banana bread' }))

      const res = await notesGET(new NextRequest('http://localhost/api/notes?q=apple'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.notes).toHaveLength(1)
      expect(data.notes[0].content).toBe('apple pie')
    })

    it('4. DELETE removes a note', async () => {
      const created = await notesPOST(postReq('http://localhost/api/notes', { content: 'to delete' }))
      const { note } = await created.json()

      const delRes = await notesDELETE(new NextRequest(`http://localhost/api/notes?id=${note.id}`))
      expect(delRes.status).toBe(200)

      const listRes = await notesGET(new NextRequest('http://localhost/api/notes'))
      const list = await listRes.json()
      expect(list.notes).toHaveLength(0)
    })

    it('5. batch POST action:delete deletes multiple notes', async () => {
      const a = await notesPOST(postReq('http://localhost/api/notes', { content: 'a' }))
      const b = await notesPOST(postReq('http://localhost/api/notes', { content: 'b' }))
      const idA = (await a.json()).note.id
      const idB = (await b.json()).note.id

      const res = await batchPOST(postReq('http://localhost/api/notes/batch', { action: 'delete', ids: [idA, idB] }))
      expect(res.status).toBe(200)

      const listRes = await notesGET(new NextRequest('http://localhost/api/notes'))
      const list = await listRes.json()
      expect(list.notes).toHaveLength(0)
    })

    it('6. batch POST action:tag tags multiple notes', async () => {
      const a = await notesPOST(postReq('http://localhost/api/notes', { content: 'a' }))
      const b = await notesPOST(postReq('http://localhost/api/notes', { content: 'b' }))
      const idA = (await a.json()).note.id
      const idB = (await b.json()).note.id

      const res = await batchPOST(postReq('http://localhost/api/notes/batch', { action: 'tag', ids: [idA, idB], tag: 'work' }))
      expect(res.status).toBe(200)

      const tagsRes = await tagsGET()
      const tags = await tagsRes.json()
      const work = tags.tags.find((t: { name: string }) => t.name === 'work')
      expect(work).toBeDefined()
      expect(work.count).toBe(2)
    })

    it('7. batch POST with empty ids returns 400', async () => {
      const res = await batchPOST(postReq('http://localhost/api/notes/batch', { action: 'delete', ids: [] }))
      expect(res.status).toBe(400)
    })
  })

  describe('tags', () => {
    it('8. tags GET returns tags; tag appears after creating a note with it', async () => {
      const empty = await tagsGET()
      expect((await empty.json()).tags).toHaveLength(0)

      await notesPOST(postReq('http://localhost/api/notes', { content: 'tagged', tags: ['mytag'] }))
      const res = await tagsGET()
      const tags = await res.json()
      const mytag = tags.tags.find((t: { name: string }) => t.name === 'mytag')
      expect(mytag).toBeDefined()
      expect(mytag.count).toBe(1)
    })

    it('9. tags PATCH renameTag renames a tag', async () => {
      await notesPOST(postReq('http://localhost/api/notes', { content: 'x', tags: ['old'] }))

      const patchRes = await tagsPATCH(postReq('http://localhost/api/tags', { oldName: 'old', newName: 'new' }))
      expect(patchRes.status).toBe(200)

      const res = await tagsGET()
      const tags = await res.json()
      const names = tags.tags.map((t: { name: string }) => t.name)
      expect(names).toContain('new')
      expect(names).not.toContain('old')
    })

    it('10. tags DELETE removes a tag', async () => {
      await notesPOST(postReq('http://localhost/api/notes', { content: 'x', tags: ['temp'] }))

      const delRes = await tagsDELETE(new NextRequest('http://localhost/api/tags?name=temp'))
      expect(delRes.status).toBe(200)

      const res = await tagsGET()
      const tags = await res.json()
      const names = tags.tags.map((t: { name: string }) => t.name)
      expect(names).not.toContain('temp')
    })
  })

  describe('budgets', () => {
    it('12. budgets POST upserts and GET by month returns it; invalid month 400', async () => {
      const res = await budgetsPOST(postReq('http://localhost/api/budgets', {
        month: '2026-07', fixedBudget: 1000, variableBudget: 500,
      }))
      expect(res.status).toBe(200)
      const { budget } = await res.json()
      expect(budget.month).toBe('2026-07')
      expect(budget.fixedBudget).toBe(1000)

      const getRes = await budgetsGET(new NextRequest('http://localhost/api/budgets?month=2026-07'))
      expect(getRes.status).toBe(200)
      const got = await getRes.json()
      expect(got.budget.month).toBe('2026-07')

      const bad = await budgetsPOST(postReq('http://localhost/api/budgets', { month: '07-2026' }))
      expect(bad.status).toBe(400)
    })
  })

  describe('habits', () => {
    it('13. habits POST creates a habit and GET dashboard returns it', async () => {
      const res = await habitsPOST(postReq('http://localhost/api/habits', { name: 'exercise' }))
      expect(res.status).toBe(200)
      const { habit } = await res.json()
      expect(habit.name).toBe('exercise')

      const dashRes = await habitsGET()
      expect(dashRes.status).toBe(200)
      const dash = await dashRes.json()
      expect(dash.habits.some((h: { id: string }) => h.id === habit.id)).toBe(true)
    })

    it('14. habits toggle marks completion then unmarks', async () => {
      const created = await habitsPOST(postReq('http://localhost/api/habits', { name: 'read' }))
      const { habit } = await created.json()
      const today = new Date().toISOString().slice(0, 10)

      const on = await habitsPOST(postReq('http://localhost/api/habits', { _action: 'toggle', habitId: habit.id, date: today }))
      expect(on.status).toBe(200)
      const onData = await on.json()
      expect(onData.completed).toBe(true)

      const off = await habitsPOST(postReq('http://localhost/api/habits', { _action: 'toggle', habitId: habit.id, date: today }))
      const offData = await off.json()
      expect(offData.completed).toBe(false)
    })
  })

  describe('weight', () => {
    it('17. weight POST creates a log and GET returns grouped by person', async () => {
      const res = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'me', date: '2026-01-15', weight: 70.5, note: '晨起',
      }))
      expect(res.status).toBe(200)
      const { weightLog } = await res.json()
      expect(weightLog.person).toBe('me')
      expect(weightLog.date).toBe('2026-01-15')
      expect(weightLog.weight).toBe(70.5)
      expect(weightLog.note).toBe('晨起')

      const getRes = await weightGET()
      expect(getRes.status).toBe(200)
      const data = await getRes.json()
      expect(data.me).toHaveLength(1)
      expect(data.her).toHaveLength(0)
      expect(data.me[0].id).toBe(weightLog.id)
    })

    it('18. weight POST overwrites same person + date', async () => {
      await weightPOST(postReq('http://localhost/api/weight', {
        person: 'her', date: '2026-01-15', weight: 52.0,
      }))
      const res = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'her', date: '2026-01-15', weight: 51.5,
      }))
      expect(res.status).toBe(200)

      const getRes = await weightGET()
      const data = await getRes.json()
      expect(data.her).toHaveLength(1)
      expect(data.her[0].weight).toBe(51.5)
    })

    it('19. weight POST returns 400 for invalid person/date/weight', async () => {
      const badPerson = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'other', date: '2026-01-15', weight: 70,
      }))
      expect(badPerson.status).toBe(400)
      expect((await badPerson.json()).error).toBe('invalid person')

      const badDate = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'me', date: '2026-13-40', weight: 70,
      }))
      expect(badDate.status).toBe(400)

      const badDateFmt = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'me', date: '2026/01/15', weight: 70,
      }))
      expect(badDateFmt.status).toBe(400)

      const badWeight = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'me', date: '2026-01-15', weight: 0,
      }))
      expect(badWeight.status).toBe(400)
      expect((await badWeight.json()).error).toBe('invalid weight')

      const badWeightHigh = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'me', date: '2026-01-15', weight: 501,
      }))
      expect(badWeightHigh.status).toBe(400)
    })

    it('20. weight GET returns empty arrays when no logs', async () => {
      const res = await weightGET()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.me).toEqual([])
      expect(data.her).toEqual([])
    })

    it('21. weight DELETE removes a log; missing id returns 400', async () => {
      const created = await weightPOST(postReq('http://localhost/api/weight', {
        person: 'me', date: '2026-01-15', weight: 70.5,
      }))
      const { weightLog } = await created.json()

      const delRes = await weightDELETE(new NextRequest(`http://localhost/api/weight?id=${weightLog.id}`))
      expect(delRes.status).toBe(200)
      expect((await delRes.json()).success).toBe(true)

      const getRes = await weightGET()
      const data = await getRes.json()
      expect(data.me).toHaveLength(0)

      const missing = await weightDELETE(new NextRequest('http://localhost/api/weight'))
      expect(missing.status).toBe(400)
    })
  })

  describe('export & backup', () => {
    it('15. export GET returns markdown response', async () => {
      await notesPOST(postReq('http://localhost/api/notes', { content: 'export me' }))
      const res = await exportGET(new NextRequest('http://localhost/api/export'))
      expect(res.status).toBe(200)
      const contentType = res.headers.get('content-type') || ''
      expect(contentType).toContain('text/markdown')
      const text = await res.text()
      expect(text).toContain('export me')
    })

    it('16. backup GET returns JSON with notes array', async () => {
      await notesPOST(postReq('http://localhost/api/notes', { content: 'backup me' }))
      const res = await backupGET(new NextRequest('http://localhost/api/backup'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data.notes)).toBe(true)
      expect(data.notes).toHaveLength(1)
      expect(data.version).toBe('1')
    })
  })
})
