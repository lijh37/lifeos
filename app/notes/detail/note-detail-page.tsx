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

  useEffect(() => {
    let ignore = false
    setNote(null)
    setNotFound(false)
    if (!id) {
      setNotFound(true)
      return
    }
    fetchNote(id)
      .then((n) => { if (!ignore) n ? setNote(n) : setNotFound(true) })
      .catch(() => { if (!ignore) setNotFound(true) })
    return () => { ignore = true }
  }, [id])

  if (notFound) return <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">笔记不存在</div>
  if (!note) return null // 父组件 Suspense 骨架屏兜底（app/notes/detail/page.tsx）
  return <NoteDetailClient initialNote={note} />
}
