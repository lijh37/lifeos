const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export async function createNoteViaApi(
  title: string,
  content = '',
  tags: string[] = [],
): Promise<{ id: string; title: string }> {
  const res = await fetch(`${BASE_URL}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'note', title, content, tags }),
  })
  const data = (await res.json()) as { note: { id: string; title: string } }
  return { id: data.note.id, title: data.note.title }
}

export async function deleteNoteViaApi(id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/notes/${id}`, { method: 'DELETE' })
}
