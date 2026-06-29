import { NextRequest, NextResponse } from 'next/server'
import { initDB, getClient } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  await initDB()
  const body = await req.json()
  const { ids } = body as { ids: string[] }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Invalid ids array' }, { status: 400 })
  }

  const db = getClient()
  const now = Date.now()
  // Set sort_order based on position (first = highest order)
  for (let i = 0; i < ids.length; i++) {
    await db.execute({
      sql: 'UPDATE notes SET sort_order = ?, updated_at = ? WHERE id = ?',
      args: [(ids.length - i), new Date(now + i).toISOString(), ids[i]],
    })
  }

  return NextResponse.json({ success: true })
}
