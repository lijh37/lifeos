'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Paperclip,
  Image,
  FileText,
  Archive,
  File as FileIcon,
  Trash2,
  Loader2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatFileSize } from '@/lib/utils'
import { buildAcceptAttribute } from '@/lib/attachments'
import type { Attachment } from '@/lib/types'

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB，与服务端一致
const UPLOAD_TIMEOUT = 60000 // 60s 超时

// 由服务端白名单派生，保证文件选择器与服务端接受的类型永远一致。
const ACCEPT_ATTRIBUTE = buildAcceptAttribute()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('zip') || mimeType.includes('gzip') || mimeType.includes('tar')) return Archive
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('csv')) return FileText
  return FileIcon
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AttachmentSectionProps {
  noteId: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttachmentSection({ noteId }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes/${noteId}/attachments`)
      const data = await res.json()
      setAttachments(data.attachments || [])
    } catch {
      // Silent fail on initial load
    } finally {
      setLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  // Handle file upload
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setUploading(true)
    let uploaded = 0
    let failed = 0

    for (const file of fileArray) {
      // 客户端文件大小预检
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: 文件超过 ${formatFileSize(MAX_FILE_SIZE)} 限制`)
        failed++
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT)

        const res = await fetch(`/api/notes/${noteId}/attachments`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          setAttachments(prev => [...prev, data.attachment])
          uploaded++
        } else {
          const err = await res.json().catch(() => ({ error: '上传失败' }))
          toast.error(`${file.name}: ${err.error}`)
          failed++
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          toast.error(`${file.name}: 上传超时，请检查网络后重试`)
        } else {
          toast.error(`${file.name}: 网络错误，请检查连接`)
        }
        failed++
      }
    }

    setUploading(false)

    if (uploaded > 0) {
      toast.success(`成功上传 ${uploaded} 个文件${failed > 0 ? `，${failed} 个失败` : ''}`)
      if (attachments.length === 0) setExpanded(true)
    }
  }, [noteId, attachments.length])

  // Handle delete
  const handleDelete = useCallback(async (attachment: Attachment, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Optimistic removal
    setAttachments(prev => prev.filter(a => a.id !== attachment.id))

    try {
      const res = await fetch(`/api/notes/${noteId}/attachments?attachmentId=${attachment.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        // Rollback on failure
        setAttachments(prev => [...prev, attachment])
        toast.error('删除失败，请重试')
      } else {
        toast.success('已删除')
      }
    } catch {
      setAttachments(prev => [...prev, attachment])
      toast.error('删除失败，请重试')
    }
  }, [noteId])

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload])

  // File picker trigger
  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files)
      // Reset so same file can be selected again
      e.target.value = ''
    }
  }, [handleUpload])

  if (loading) return null

  const hasAttachments = attachments.length > 0

  return (
    <div
      ref={dragRef}
      className={cn(
        'border-t shrink-0 transition-colors',
        isDragging && 'bg-accent/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Section header / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-accent/30 transition-colors"
      >
        <Paperclip className="h-3.5 w-3.5" />
        <span>附件</span>
        {hasAttachments && (
          <span className="text-[10px] text-muted-foreground/60">({attachments.length})</span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/40">
          {expanded ? '收起' : hasAttachments ? '展开' : '拖拽或点击上传'}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-3">
          {/* Upload area */}
          <div
            onClick={handleClickUpload}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-xs text-muted-foreground/60 transition-colors',
              isDragging
                ? 'border-primary bg-primary/5 text-primary'
                : 'hover:border-muted-foreground/30 hover:text-muted-foreground',
            )}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />上传中…</>
            ) : (
              <><Upload className="h-4 w-4" />{isDragging ? '松开以上传' : '点击或拖拽文件到此处上传'}</>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept={ACCEPT_ATTRIBUTE}
          />

          {/* Attachment list */}
          {hasAttachments && (
            <div className="mt-2 space-y-1">
              {attachments.map((att) => {
                const Icon = getFileIcon(att.mimeType)
                return (
                  <div
                    key={att.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate hover:underline"
                      title={att.filename}
                    >
                      {att.filename}
                    </a>
                    <span className="shrink-0 text-[10px] text-muted-foreground/50">
                      {formatFileSize(att.fileSize)}
                    </span>
                    {isImage(att.mimeType) && (
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded border">
                        <img
                          src={att.url}
                          alt={att.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDelete(att, e)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!hasAttachments && !uploading && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground/40">
              暂无附件
            </p>
          )}
        </div>
      )}
    </div>
  )
}
