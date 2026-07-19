import { NextRequest, NextResponse } from 'next/server'
import { getClient, syncNoteTags } from '@/lib/db'
import { isAuthorized } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { action, ids, tag } = body as { action: 'delete' | 'tag'; ids: string[]; tag?: string }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  }

  const db = getClient()

  if (action === 'delete') {
    const tx = await db.transaction()
    try {
      // FK CASCADE handles note_tags / attachments cleanup automatically
      for (const noteId of ids) {
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
      // syncNoteTags handles tag-existence + note_tags linking per note
      for (const noteId of ids) {
        await syncNoteTags(noteId, [tag], tx)
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
