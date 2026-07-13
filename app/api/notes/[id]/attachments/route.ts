import { NextRequest, NextResponse } from 'next/server'
import { createAttachment, getAttachmentsByNoteId, deleteAttachment, getAttachment } from '@/lib/db'
import { put, del } from '@vercel/blob'
import path from 'node:path'
import crypto from 'node:crypto'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/** 允许上传的 MIME 类型白名单 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/gzip',
])

function isAllowedMime(mime: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mime)) return true
  if (mime.startsWith('image/')) return true
  return false
}

/**
 * 生成唯一文件名：UUID + 原始扩展名
 */
function uniqueFilename(original: string): string {
  const ext = path.extname(original).toLowerCase() || ''
  return `${crypto.randomUUID()}${ext}`
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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

  // MIME 类型检查
  const mimeType = file.type || 'application/octet-stream'
  if (!isAllowedMime(mimeType)) {
    return NextResponse.json(
      { error: `不支持的文件类型（${mimeType}）` },
      { status: 415 }
    )
  }

  // 上传到 Vercel Blob
  const filename = uniqueFilename(file.name)

  try {
    const blob = await put(filename, file, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: true,
    })

    // 创建数据库记录（使用 Blob 返回的 URL）
    const attachment = await createAttachment({
      noteId,
      filename: file.name,
      url: blob.url,
      mimeType,
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
    // 从 Vercel Blob 删除
    try {
      await del(attachment.url)
    } catch {
      // Blob 可能已被删除，忽略
    }

    // 删除数据库记录
    await deleteAttachment(attachmentId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[attachments] Delete failed:', err)
    return NextResponse.json({ error: '删除失败，请重试' }, { status: 500 })
  }
}
