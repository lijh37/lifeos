import { NextRequest, NextResponse } from 'next/server'
import { createAttachment, getAttachmentsByNoteId, deleteAttachment, getAttachment } from '@/lib/db'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notes')
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
  // Allow common image types and document types
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
  } catch {
    return NextResponse.json({ error: '无效的请求数据' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
  }

  // 文件大小检查
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `文件大小超过限制（最大 ${formatFileSize(MAX_FILE_SIZE)}）` },
      { status: 413 }
    )
  }

  // MIME 类型检查
  if (!isAllowedMime(file.type)) {
    return NextResponse.json(
      { error: `不支持的文件类型: ${file.type || '未知'}` },
      { status: 415 }
    )
  }

  // 保存文件到 public/uploads/notes/
  const filename = uniqueFilename(file.name)
  const filePath = path.join(UPLOAD_DIR, filename)

  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // URL 路径（Next.js 将 public/ 映射到 /）
    const url = `/uploads/notes/${filename}`

    // 创建数据库记录
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
    // 删除物理文件
    const filename = path.basename(attachment.url)
    const filePath = path.join(UPLOAD_DIR, filename)
    try {
      await unlink(filePath)
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
