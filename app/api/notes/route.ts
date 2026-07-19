import { NextRequest, NextResponse } from 'next/server'
import { createNote, getNotesCursor, deleteNote, searchNotes, getNotesByDateRange } from '@/lib/db'
import { isAuthorized } from '@/lib/auth-guard'
import type { Note } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const q = searchParams.get('q')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200'), 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const summary = searchParams.get('summary') === 'true'
  const tag = searchParams.get('tag')

  const cacheHeaders = { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=60' } }

  if (q) {
    const notes = await searchNotes(q, tag || undefined)
    return NextResponse.json({ notes }, cacheHeaders)
  }

  if (startDate && endDate) {
    const notes = await getNotesByDateRange(startDate, endDate, limit, offset)
    return NextResponse.json({ notes }, cacheHeaders)
  }

  const cursor = searchParams.get('cursor')

  const result = await getNotesCursor(limit, cursor || undefined, tag || undefined, summary)
  const notes = result.notes
  const nextCursor = result.nextCursor

  return NextResponse.json({ notes, nextCursor }, cacheHeaders)
}

const NOTE_TYPES = ['note', 'todo', 'event'] as const

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()

  // Validate inputs — reject anything that isn't the expected shape.
  if (body.content !== undefined && typeof body.content !== 'string') {
    return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
  }
  if (body.title !== undefined && typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title must be a string' }, { status: 400 })
  }
  if (body.type !== undefined && !NOTE_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.some((t: unknown) => typeof t !== 'string'))) {
    return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 })
  }
  if (body.dueDate !== undefined && body.dueDate !== null && isNaN(Date.parse(body.dueDate))) {
    return NextResponse.json({ error: 'invalid dueDate' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const note: Note = {
    id: crypto.randomUUID(),
    content: typeof body.content === 'string' ? body.content : '',
    title: typeof body.title === 'string' ? body.title : null,
    type: NOTE_TYPES.includes(body.type) ? body.type : 'note',
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : [],
    dueDate: body.dueDate ?? null,
    done: false,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  }
  await createNote(note)
  return NextResponse.json({ note })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteNote(id)
  return NextResponse.json({ success: true })
}
