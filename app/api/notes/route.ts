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

  if (q) {
    let notes = await searchNotes(q)
    if (tag) {
      notes = notes.filter(n => n.tags.includes(tag))
    }
    return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes })
  }

  const noteType = type && type !== 'all' ? type as Note['type'] : undefined

  if (startDate && endDate) {
    const notes = await getNotesByDateRange(startDate, endDate, noteType, limit, offset)
    return NextResponse.json({ notes: summary ? notes.map(stripContent) : notes })
  }

  const cursor = searchParams.get('cursor')

  const result = await getNotesCursor(noteType, limit, cursor || undefined, tag || undefined, summary)
  const notes = result.notes
  const nextCursor = result.nextCursor

  return NextResponse.json({ notes, nextCursor })
}

function stripContent(note: Note): Note {
  const preview = note.content ? note.content.slice(0, 80) : ''
  return { ...note, content: preview }
}

export async function POST(req: NextRequest) {
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
