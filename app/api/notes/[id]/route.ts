import { NextRequest, NextResponse } from 'next/server'
import { getNote, updateNote, deleteNote, initDB } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB()
  const { id } = await params
  const note = await getNote(id)
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ note })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB()
  const { id } = await params
  const body = await req.json()
  await updateNote(id, body)
  const note = await getNote(id)
  return NextResponse.json({ note })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB()
  const { id } = await params
  await deleteNote(id)
  return NextResponse.json({ success: true })
}
