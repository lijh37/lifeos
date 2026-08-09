/**
 * 笔记服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：直接调用 lib/db 模块（动态 import，避免把 @libsql/client 拉进 web bundle）
 * - Web / 测试：fetch('/api/...') 透传，URL/method/headers/body 与现有 API route 逐字一致
 *
 * 失败语义：抛 Error（web 分支从响应体 error 字段提取消息，组件已有 try/catch）。
 */

import { isNativeCapacitor } from './env'
import { throwHttpError } from './http'
import type { Note } from '@/lib/types'

export interface NoteListParams {
  q?: string
  tag?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

export async function listNotes(params: NoteListParams = {}): Promise<Note[]> {
  if (isNativeCapacitor()) {
    const { getNotes, searchNotes, getNotesByDateRange } = await import('@/lib/db/native')
    if (params.q) {
      return searchNotes(params.q, params.tag || undefined)
    }
    if (params.startDate && params.endDate) {
      return getNotesByDateRange(params.startDate, params.endDate, params.limit ?? 200, params.offset ?? 0)
    }
    return getNotes(params.limit ?? 200)
  }

  const sp = new URLSearchParams()
  if (params.q !== undefined) sp.set('q', params.q)
  if (params.tag !== undefined) sp.set('tag', params.tag)
  if (params.limit !== undefined) sp.set('limit', String(params.limit))
  if (params.offset !== undefined) sp.set('offset', String(params.offset))
  if (params.startDate !== undefined) sp.set('startDate', params.startDate)
  if (params.endDate !== undefined) sp.set('endDate', params.endDate)

  const res = await fetch(`/api/notes?${sp}`)
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.notes
}

export async function getNote(id: string): Promise<Note | null> {
  if (isNativeCapacitor()) {
    const { getNote: dbGetNote } = await import('@/lib/db/native')
    return dbGetNote(id)
  }

  const res = await fetch(`/api/notes?id=${id}`)
  if (res.status === 404) return null
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.note
}

export async function createNote(input: {
  title?: string
  content?: string
  tags?: string[]
  dueDate?: string | null
}): Promise<Note> {
  if (isNativeCapacitor()) {
    const { createNote: dbCreateNote } = await import('@/lib/db/native')
    const now = new Date().toISOString()
    const note: Note = {
      id: crypto.randomUUID(),
      content: input.content ?? '',
      title: input.title ?? null,
      type: 'note',
      tags: input.tags ?? [],
      dueDate: input.dueDate ?? null,
      done: false,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    return dbCreateNote(note)
  }

  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'note', ...input }),
  })
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.note
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note> {
  if (isNativeCapacitor()) {
    const { updateNote: dbUpdateNote } = await import('@/lib/db/native')
    return dbUpdateNote(id, updates)
  }

  const res = await fetch('/api/notes', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.note
}

export async function deleteNote(id: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { deleteNote: dbDeleteNote } = await import('@/lib/db/native')
    return dbDeleteNote(id)
  }

  const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
  if (!res.ok) await throwHttpError(res)
}

export async function batchDeleteNotes(ids: string[]): Promise<void> {
  if (isNativeCapacitor()) {
    const { getClient } = await import('@/lib/db/native')
    const tx = await getClient().transaction()
    try {
      // FK CASCADE 自动清理 note_tags / attachments
      for (const noteId of ids) {
        await tx.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [noteId] })
      }
      await tx.commit()
    } catch (e) {
      await tx.rollback()
      throw e
    }
    return
  }

  const res = await fetch('/api/notes/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', ids }),
  })
  if (!res.ok) await throwHttpError(res)
}

export async function batchTagNotes(ids: string[], tag: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { getClient, syncNoteTags } = await import('@/lib/db/native')
    const tx = await getClient().transaction()
    try {
      // syncNoteTags 处理标签存在性 + note_tags 关联（沿用 API route 事务逻辑）
      for (const noteId of ids) {
        await syncNoteTags(noteId, [tag], tx)
      }
      await tx.commit()
    } catch (e) {
      await tx.rollback()
      throw e
    }
    return
  }

  const res = await fetch('/api/notes/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'tag', ids, tag }),
  })
  if (!res.ok) await throwHttpError(res)
}

export async function exportNotesMarkdown(): Promise<string> {
  if (isNativeCapacitor()) {
    const { getNotes } = await import('@/lib/db/native')
    const { stripMarkdown } = await import('@/lib/strip-markdown')
    const notes = await getNotes(Number.MAX_SAFE_INTEGER)

    const lines: string[] = []
    for (const note of notes) {
      lines.push(`# ${note.title?.trim() || '无标题'}`)
      lines.push('')
      const meta: string[] = [`创建: ${new Date(note.createdAt).toLocaleString('zh-CN')}`]
      if (note.tags.length > 0) meta.push(`标签: ${note.tags.join('、')}`)
      if (note.dueDate) meta.push(`截止: ${note.dueDate.slice(0, 10)}`)
      lines.push(meta.join(' · '))
      lines.push('')
      if (note.content) {
        lines.push(stripMarkdown(note.content, Number.MAX_SAFE_INTEGER))
      }
      lines.push('')
      lines.push('---')
      lines.push('')
    }
    return lines.join('\n')
  }

  const res = await fetch('/api/export')
  if (!res.ok) await throwHttpError(res)
  return res.text()
}

// ─── 校验函数（纯函数，供 API route 复用；错误消息与 app/api/notes/route.ts POST 逐字一致）───

export function validateNoteInput(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  if (b.content !== undefined && typeof b.content !== 'string') {
    return 'content must be a string'
  }
  if (b.title !== undefined && typeof b.title !== 'string') {
    return 'title must be a string'
  }
  if (b.type !== undefined && b.type !== 'note') {
    return 'invalid type'
  }
  if (
    b.tags !== undefined &&
    (!Array.isArray(b.tags) || b.tags.some((t: unknown) => typeof t !== 'string'))
  ) {
    return 'tags must be an array of strings'
  }
  if (b.dueDate !== undefined && b.dueDate !== null && isNaN(Date.parse(b.dueDate as string))) {
    return 'invalid dueDate'
  }
  return null
}
