import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { createAttachment, initDB } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const noteId = formData.get('noteId') as string | null

    if (!file || !noteId) {
      return NextResponse.json(
        { error: '缺少文件或 noteId' },
        { status: 400 }
      )
    }

    // Read file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine filename and path
    const ext = path.extname(file.name) || '.bin'
    const uniqueName = `${crypto.randomUUID?.() || Date.now().toString(36)}${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, uniqueName)
    await writeFile(filePath, buffer)

    // Create DB record
    const attachment = await createAttachment({
      noteId,
      filename: file.name,
      url: `/uploads/${uniqueName}`,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const noteId = searchParams.get('noteId')
    if (!noteId) {
      return NextResponse.json({ error: '缺少 noteId' }, { status: 400 })
    }
    const { getAttachmentsByNoteId } = await import('@/lib/db')
    const attachments = await getAttachmentsByNoteId(noteId)
    return NextResponse.json({ attachments })
  } catch (error) {
    console.error('List attachments error:', error)
    return NextResponse.json({ error: '获取附件列表失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: '缺少附件 ID' }, { status: 400 })
    }

    const { getAttachment, deleteAttachment } = await import('@/lib/db')
    const { unlink } = await import('fs/promises')

    const attachment = await getAttachment(id)
    if (!attachment) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 })
    }

    // Delete file from filesystem
    try {
      const filePath = path.join(process.cwd(), 'public', attachment.url)
      await unlink(filePath)
    } catch { /* file may not exist */ }

    await deleteAttachment(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
