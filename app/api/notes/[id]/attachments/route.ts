import { NextRequest, NextResponse } from 'next/server'
import { createAttachment, getAttachmentsByNoteId, deleteAttachment, getAttachment } from '@/lib/db'
import { getStorageDriver } from '@/lib/storage'
import { formatFileSize } from '@/lib/utils'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * 判断 FormDataEntryValue 是否为文件（而非文本字段）。
 * 使用 duck-type 而非 instanceof File，避免跨 realm 原型链断裂问题。
 */
function isFileLike(value: FormDataEntryValue): value is File {
  if (typeof value === 'string') return false
  // File extends Blob — 检查 arrayBuffer 方法确认是 Blob/File
  return typeof value === 'object' && value !== null && 'arrayBuffer' in value && 'name' in value
}

// ─── GET: 列出笔记附件 ───────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const attachments = await getAttachmentsByNoteId(id)
  return NextResponse.json({ attachments })
}

// ─── POST: 上传附件 ──────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err) {
    console.error('[attachments] formData() failed:', err)
    return NextResponse.json({ error: '无法解析请求数据，请重试' }, { status: 400 })
  }

  const entry = formData.get('file')
  if (!entry) {
    return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
  }
  if (typeof entry === 'string') {
    return NextResponse.json({ error: '文件字段格式错误' }, { status: 400 })
  }
  if (!isFileLike(entry)) {
    console.error('[attachments] Entry is not file-like:', typeof entry, entry)
    return NextResponse.json({ error: '文件数据格式异常，请重试' }, { status: 400 })
  }

  // Safe cast: isFileLike 已确认有 arrayBuffer / name 属性
  const file = entry as File & { name: string; size: number; type: string }

  // 文件大小检查
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `文件大小超过限制（最大 ${formatFileSize(MAX_FILE_SIZE)}）` },
      { status: 413 }
    )
  }

  // 上传到存储后端（Vercel Blob 或本地磁盘，由 STORAGE_DRIVER 决定）
  try {
    const { url } = await getStorageDriver().save(file, file.type || 'application/octet-stream')

    // 创建数据库记录（使用存储后端返回的 URL）
    const attachment = await createAttachment({
      noteId,
      filename: file.name,
      url,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
    })

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (err) {
    console.error('[attachments] Upload failed:', err)
    return NextResponse.json({ error: '文件上传失败，请重试' }, { status: 500 })
  }
}

// ─── DELETE: 删除附件 ────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params
  const { searchParams } = new URL(req.url)
  const attachmentId = searchParams.get('attachmentId')

  if (!attachmentId) {
    return NextResponse.json({ error: '缺少 attachmentId' }, { status: 400 })
  }

  const attachment = await getAttachment(attachmentId)

  // 验证附件属于该笔记
  if (!attachment || attachment.noteId !== noteId) {
    return NextResponse.json({ error: '附件不存在' }, { status: 404 })
  }

  try {
    // 从存储后端删除
    try {
      await getStorageDriver().remove(attachment.url)
    } catch {
      // 文件可能已被删除，忽略
    }

    // 删除数据库记录
    await deleteAttachment(attachmentId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[attachments] Delete failed:', err)
    return NextResponse.json({ error: '删除失败，请重试' }, { status: 500 })
  }
}
