import { NextRequest, NextResponse } from 'next/server'
import { createNote, getNotesCursor, deleteNote, searchNotes, getNotesByDateRange, getNotesCountByType, initDB } from '@/lib/db'
import type { Note } from '@/lib/types'

export async function GET(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const q = searchParams.get('q')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200'), 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const summary = searchParams.get('summary') === 'true'

  if (q) {
    const notes = await searchNotes(q)
    return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes })
  }

  const noteType = type && type !== 'all' ? type as Note['type'] : undefined

  if (startDate && endDate) {
    const notes = await getNotesByDateRange(startDate, endDate, noteType, limit, offset)
    return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes })
  }

  const cursor = searchParams.get('cursor')

  let notes: Note[]
  let total: number
  let nextCursor: string | null = null

  const result = await getNotesCursor(noteType, limit, cursor || undefined)
  notes = result.notes
  nextCursor = result.nextCursor
  total = await getNotesCountByType(noteType)

  return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes, total, limit, offset, nextCursor })
}

function stripContent(note: Note): Note {
  const preview = note.content ? note.content.slice(0, 80) : ''
  return { ...note, content: preview }
}

export async function POST(req: NextRequest) {
  await initDB()
  const body = await req.json()
  const now = new Date().toISOString()
  const note: Note = {
    id: crypto.randomUUID(),
    content: body.content,
    title: body.title || null,
    type: body.type || 'note',
    tags: body.tags || [],
    dueDate: body.dueDate || null,
    done: false,
    createdAt: now,
    updatedAt: now,
  }
  await createNote(note)
  return NextResponse.json({ note })
}

export async function DELETE(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteNote(id)
  return NextResponse.json({ success: true })
}
