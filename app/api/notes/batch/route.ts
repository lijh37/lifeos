import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { genId } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, ids, tag } = body as { action: 'delete' | 'tag'; ids: string[]; tag?: string }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  }

  const db = getClient()

  if (action === 'delete') {
    const tx = await db.transaction()
    try {
      for (const noteId of ids) {
        await tx.execute({ sql: 'DELETE FROM note_tags WHERE note_id = ?', args: [noteId] })
        await tx.execute({ sql: 'DELETE FROM attachments WHERE note_id = ?', args: [noteId] })
        await tx.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [noteId] })
      }
      await tx.commit()
    } catch (e) {
      await tx.rollback()
      console.error('[batch] 批量删除事务失败:', e)
      return NextResponse.json({ error: '批量删除失败' }, { status: 500 })
    }
  } else if (action === 'tag') {
    if (!tag) {
      return NextResponse.json({ error: 'Tag name required' }, { status: 400 })
    }
    const tx = await db.transaction()
    try {
      // Ensure tag exists
      const existing = await tx.execute({ sql: 'SELECT id FROM tags WHERE name = ?', args: [tag] })
      const tagId = existing.rows.length > 0
        ? existing.rows[0].id as string
        : genId()
      if (existing.rows.length === 0) {
        await tx.execute({
          sql: 'INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)',
          args: [tagId, tag, new Date().toISOString()],
        })
      }
      // Link all notes to tag (IGNORE skips duplicates)
      for (const noteId of ids) {
        await tx.execute({
          sql: 'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
          args: [noteId, tagId],
        })
      }
      await tx.commit()
    } catch (e) {
      await tx.rollback()
      console.error('[batch] 批量打标签事务失败:', e)
      return NextResponse.json({ error: '批量打标签失败' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
