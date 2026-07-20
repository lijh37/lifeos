import { NextRequest, NextResponse } from 'next/server'
import { getAllTags, renameTag, deleteTag } from '@/lib/db'

export async function GET() {
  const tags = await getAllTags()
  return NextResponse.json({ tags })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { oldName, newName } = body
  if (!oldName || !newName) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }
  await renameTag(oldName, newName)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: '缺少 name 参数' }, { status: 400 })
  }
  await deleteTag(name)
  return NextResponse.json({ success: true })
}
