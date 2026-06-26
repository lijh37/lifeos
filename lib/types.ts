export type NoteType = 'note' | 'task' | 'event'
export type EntryType = NoteType | 'habit'

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


export interface Budget {
  id: string
  month: string
  fixedBudget: number
  variableBudget: number
  fixedActual: number | null
  variableActual: number | null
  notes: string
  isCompleted: boolean
  savingsCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id: string
  name: string
  description: string
  frequency: 'daily' | 'weekly'
  createdAt: string
}

export interface HabitCompletion {
  id: string
  habitId: string
  date: string
  completed: boolean
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  relatedNoteId: string | null
  conversationId: string | null
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface AIResponse {
  type: EntryType
  title: string
  tags: string[]
  dueDate: string | null
  summary: string
  isNewEntry: boolean
}
