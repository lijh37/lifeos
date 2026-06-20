import { NextRequest, NextResponse } from 'next/server'
import { createNote, getNotes, deleteNote, searchNotes, getNotesByDateRange, initDB } from '@/lib/db'
import type { Note } from '@/lib/types'

export async function GET(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const q = searchParams.get('q')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (q) {
    const notes = await searchNotes(q)
    return NextResponse.json({ notes })
  }

  if (startDate && endDate) {
    const notes = await getNotesByDateRange(startDate, endDate, type as Note['type'] | undefined)
    return NextResponse.json({ notes })
  }

  const notes = type && type !== 'all'
    ? await getNotes(type as Note['type'])
    : await getNotes()
  return NextResponse.json({ notes })
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
