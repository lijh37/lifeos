'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import type { ChatMessage, Conversation } from '@/lib/types'
import { genId } from '@/lib/utils'

interface ChatContextValue {
  input: string
  setInput: (v: string) => void
  messages: UIMessage[]
  status: 'streaming' | 'submitted' | 'ready' | 'error'
  error: Error | undefined
  timedOut: boolean
  conversations: Conversation[]
  activeConversationId: string | null
  showSidebar: boolean
  setShowSidebar: (v: boolean) => void
  loadingConversations: boolean
  chatInitialized: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  sendMessage: (data: { text: string }) => void
  handleNewConversation: () => void
  handleSelectConversation: (id: string) => void
  handleDeleteConversation: (id: string) => void
  handleCopy: (text: string) => void
  handleRetry: () => void
  handleSubmit: (e: React.FormEvent) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  getPartText: (part: { type: string; text?: string }) => string
  getMessageText: (msg: UIMessage) => string
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [timedOut, setTimedOut] = useState(false)
  const sentAtRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [chatInitialized, setChatInitialized] = useState(false)
  const savedCountRef = useRef(0)
  const activeConvIdRef = useRef<string | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: async (event) => {
      const { messages: allMessages, isAbort, isError } = event
      setTimedOut(false)
      if (isAbort || isError) return

      const unsaved = allMessages.slice(savedCountRef.current)
      if (unsaved.length > 0) {
        for (const m of unsaved) {
          const text = m.parts
            .map((p: { type: string; text?: string }) => getPartText(p))
            .join('')
          try {
            await fetch('/api/chat/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: m.id || genId(),
                role: m.role,
                content: text,
                relatedNoteId: null,
                conversationId: activeConversationId,
                createdAt: new Date().toISOString(),
              }),
            })
          } catch (e) {
            console.error('Failed to save chat message:', e)
          }
        }
        savedCountRef.current = allMessages.length
      }

      if (activeConversationId) {
        const firstUserMsg = allMessages.find(m => m.role === 'user')
        if (firstUserMsg) {
          const firstText = firstUserMsg.parts
            .map((p: { type: string; text?: string }) => getPartText(p))
            .join('')
          const title = firstText.slice(0, 30) + (firstText.length > 30 ? '...' : '')
          await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeConversationId, title }),
          })
          loadConversations()
        }
      }
    },
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (status === 'submitted') {
      sentAtRef.current = Date.now()
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true)
      }, 15000)
    } else if (status === 'streaming' || status === 'ready') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = undefined
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [status])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId)
    } else {
      loadRecentMessages()
    }
  }, [activeConversationId])

  async function loadConversations() {
    setLoadingConversations(true)
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations)
      }
    } catch (e) {
      console.error('Failed to load conversations:', e)
    } finally {
      setLoadingConversations(false)
    }
  }

  async function loadRecentMessages() {
    try {
      const res = await fetch('/api/chat/history')
      if (res.ok) {
        const data = await res.json()
        setInitialMessages(data.messages.map((m: ChatMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          parts: [{ type: 'text' as const, text: m.content }],
        })))
        savedCountRef.current = data.messages.length
      }
    } catch (e) {
      console.error('Failed to load chat history:', e)
    } finally {
      setChatInitialized(true)
    }
  }

  async function loadConversationMessages(conversationId: string) {
    activeConvIdRef.current = conversationId
    try {
      const res = await fetch(`/api/chat/history?conversation_id=${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages.length > 0) {
          const msgs = data.messages.map((m: ChatMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: [{ type: 'text' as const, text: m.content }],
          }))
          setMessages(msgs)
          savedCountRef.current = msgs.length
        }
      }
    } catch (e) {
      console.error('Failed to load conversation:', e)
    } finally {
      setChatInitialized(true)
    }
  }

  async function handleNewConversation() {
    const id = genId()
    activeConvIdRef.current = id
    setActiveConversationId(id)
    setMessages([])
    savedCountRef.current = 0
    setTimedOut(false)
    setShowSidebar(false)
  }

  async function handleSelectConversation(id: string) {
    activeConvIdRef.current = id
    setActiveConversationId(id)
    setShowSidebar(false)
  }

  async function handleDeleteConversation(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConversationId === id) {
      activeConvIdRef.current = null
      setActiveConversationId(null)
      loadRecentMessages()
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch { /* ignore */ }
  }

  function handleRetry() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setTimedOut(false)
      const text = lastUserMsg.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('')
      sendMessage({ text })
    }
  }

  function getPartText(part: { type: string; text?: string }): string {
    return part.type === 'text' ? (part.text || '') : ''
  }

  function getMessageText(msg: UIMessage): string {
    return msg.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim() && status === 'ready') {
      if (!activeConvIdRef.current) {
        handleNewConversation()
      }
      setTimedOut(false)
      sendMessage({ text: input })
      setInput('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = (e.target as HTMLElement).closest('form')
      if (form) form.requestSubmit()
    }
  }

  return (
    <ChatContext.Provider
      value={{
        input,
        setInput,
        messages,
        status,
        error,
        timedOut,
        conversations,
        activeConversationId,
        showSidebar,
        setShowSidebar,
        loadingConversations,
        chatInitialized,
        textareaRef,
        scrollRef,
        sendMessage,
        handleNewConversation,
        handleSelectConversation,
        handleDeleteConversation,
        handleCopy,
        handleRetry,
        handleSubmit,
        handleKeyDown,
        getPartText,
        getMessageText,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
