import { NextRequest, NextResponse } from 'next/server'
import { initDB, getConversations, createConversation, deleteConversation } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  await initDB()
  const conversations = await getConversations()
  return NextResponse.json({ conversations })
}

export async function POST(req: NextRequest) {
  await initDB()
  const { id, title } = await req.json()
  await createConversation(id, title || '新对话')
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteConversation(id)
  return NextResponse.json({ success: true })
}
