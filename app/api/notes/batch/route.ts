import { NextRequest, NextResponse } from 'next/server'
import { getNote, updateNote, getClient } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, ids, tag } = body as { action: 'delete' | 'tag'; ids: string[]; tag?: string }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  }

  if (action === 'delete') {
    const db = getClient()
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
    const db = getClient()
    const tx = await db.transaction()
    try {
      for (const noteId of ids) {
        const result = await tx.execute({
          sql: 'SELECT tags FROM notes WHERE id = ?',
          args: [noteId],
        })
        if (result.rows.length === 0) continue
        const currentTags = JSON.parse(result.rows[0].tags as string) as string[]
        const newTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag]
        await tx.execute({
          sql: "UPDATE notes SET tags = ?, updated_at = ? WHERE id = ?",
          args: [JSON.stringify(newTags), new Date().toISOString(), noteId],
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
