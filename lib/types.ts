export type NoteType = 'note' | 'task' | 'event'

export interface Note {
  id: string
  content: string
  title: string | null
  type: NoteType
  tags: string[]
  dueDate: string | null
  done: boolean
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  relatedNoteId: string | null
  createdAt: string
}

export interface AIResponse {
  type: NoteType
  title: string
  tags: string[]
  dueDate: string | null
  summary: string
  isNewEntry: boolean
}
