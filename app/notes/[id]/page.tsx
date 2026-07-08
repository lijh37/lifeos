import { getNote } from '@/lib/db'
import { NoteDetailClient } from './note-detail-client'
import { notFound } from 'next/navigation'

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const note = await getNote(id)
  if (!note) notFound()
  return <NoteDetailClient initialNote={note} />
}
