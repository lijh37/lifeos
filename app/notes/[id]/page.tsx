import { getNote, initDB } from '@/lib/db'
import { NoteDetailClient } from './note-detail-client'
import { notFound } from 'next/navigation'

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await initDB()
  const { id } = await params
  const note = await getNote(id)
  if (!note) notFound()
  return <NoteDetailClient initialNote={note} />
}
