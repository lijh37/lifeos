import { NextRequest, NextResponse } from 'next/server'
import { createNote, deleteNote, getNote, updateNote, searchNotes, getNotesByDateRange, getNotes } from '@/lib/db'
import { validateNoteInput } from '@/lib/services/notes'
import type { Note } from '@/lib/types'

const GETHandler = async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')
  const q = searchParams.get('q')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200'), 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const tag = searchParams.get('tag')

  // 单条查询：/api/notes?id=<id>（原动态段 /api/notes/[id] 已合并至此，export 构建不支持动态段）
  if (id) {
    const note = await getNote(id)
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ note })
  }

  // No HTTP caching: the list is private (auth-gated) and must reflect
  // mutations (tag rename/delete, pin, batch ops) immediately. A stale
  // cached response caused transient duplicate/missing tags after a rename.
  const noCache = { headers: { 'Cache-Control': 'private, no-store' } }

  if (q) {
    const notes = await searchNotes(q, tag || undefined)
    return NextResponse.json({ notes }, noCache)
  }

  if (startDate && endDate) {
    const notes = await getNotesByDateRange(startDate, endDate, limit, offset)
    return NextResponse.json({ notes }, noCache)
  }

  const notes = await getNotes(limit)

  return NextResponse.json({ notes }, noCache)
}

// export 构建（BUILD_TARGET=export）下 GET 置空（静态导出无服务端运行时，E301）。
// `as typeof GETHandler` 断言使 tsc 视 GET 为纯函数类型（消除 TS2722/TS18048），
// 运行时在 export 下仍为 undefined。
export const GET = (process.env.BUILD_TARGET === 'export' ? undefined : GETHandler) as typeof GETHandler

// Note.type 类型定义为字面量 'note'（见 lib/types.ts），DB 层 rowToNote 也恒映射为 'note'。
// 收紧校验只允许 'note'，避免 API 接受 todo/event 导致静默丢类型。
const NOTE_TYPES = ['note'] as const

export async function POST(req: NextRequest) {
  const body = await req.json()

  const validationError = validateNoteInput(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
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

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const note = await updateNote(id, updates)
  return NextResponse.json({ note })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteNote(id)
  return NextResponse.json({ success: true })
}
