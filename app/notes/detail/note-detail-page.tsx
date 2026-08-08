'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getNote as fetchNote } from '@/lib/services/notes'
import { NoteDetailClient } from './note-detail-client'
import type { Note } from '@/lib/types'

export default function NoteDetailPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const [note, setNote] = useState<Note | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [prevId, setPrevId] = useState(id)

  // 路由 id 变化时重置状态（渲染期调整模式，避免在 effect 内同步 setState）
  if (prevId !== id) {
    setPrevId(id)
    setNote(null)
    setNotFound(false)
  }

  useEffect(() => {
    if (!id) return
    let ignore = false
    fetchNote(id)
      .then((n) => { if (!ignore) n ? setNote(n) : setNotFound(true) })
      .catch(() => { if (!ignore) setNotFound(true) })
    return () => { ignore = true }
  }, [id])

  if (!id || notFound) return <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">笔记不存在</div>
  if (!note) return null // 父组件 Suspense 骨架屏兜底（app/notes/detail/page.tsx）
  return <NoteDetailClient initialNote={note} />
}
