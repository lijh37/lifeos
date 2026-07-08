import { NextRequest, NextResponse } from 'next/server'
import { deleteNote, getNote, updateNote } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, ids, tag } = body as { action: 'delete' | 'tag'; ids: string[]; tag?: string }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  }

  if (action === 'delete') {
    await Promise.all(ids.map(id => deleteNote(id)))
  } else if (action === 'tag') {
    if (!tag) {
      return NextResponse.json({ error: 'Tag name required' }, { status: 400 })
    }
    await Promise.all(ids.map(async (id) => {
      const note = await getNote(id)
      if (!note) return
      const tags = note.tags.includes(tag) ? note.tags : [...note.tags, tag]
      await updateNote(id, { tags })
    }))
  }

  return NextResponse.json({ success: true })
}
