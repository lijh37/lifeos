import { NextRequest, NextResponse } from 'next/server'
import { createNote, getNotesCursor, deleteNote, searchNotes, getNotesByDateRange } from '@/lib/db'
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

  const cacheHeaders = { headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=60' } }

  if (q) {
    let notes = await searchNotes(q, tag || undefined)
    return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes }, cacheHeaders)
  }

  const noteType = type && type !== 'all' ? type as Note['type'] : undefined

  if (startDate && endDate) {
    const notes = await getNotesByDateRange(startDate, endDate, noteType, limit, offset)
    return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes }, cacheHeaders)
  }

  const cursor = searchParams.get('cursor')

  const result = await getNotesCursor(noteType, limit, cursor || undefined, tag || undefined, summary)
  const notes = result.notes
  const nextCursor = result.nextCursor

  return NextResponse.json({ notes, nextCursor }, cacheHeaders)
}

function stripContent(note: Note): Note {
  const preview = note.content ? note.content.slice(0, 80) : ''
  return { ...note, content: preview }
}

const NOTE_TYPES = ['note', 'todo', 'event'] as const

export async function POST(req: NextRequest) {
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
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteNote(id)
  return NextResponse.json({ success: true })
}
