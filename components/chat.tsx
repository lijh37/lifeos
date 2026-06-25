'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useEffect, useRef } from 'react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Loader2, Copy, RefreshCw, Clock } from 'lucide-react'
import { typeLabels, typeColors } from '@/lib/constants'
import type { AIResponse, Note, ChatMessage } from '@/lib/types'

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

interface ChatProps {
  onNoteCreated?: (note: Note) => void
}

export default function Chat({ onNoteCreated }: ChatProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [timedOut, setTimedOut] = useState(false)
  const sentAtRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [chatInitialized, setChatInitialized] = useState(false)
  const savedCountRef = useRef(0)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    // Use controlled `messages` (not `initialMessages`) because history loads async
    // After load, `messages` is set via state; useChat syncs via its internal effect.
    // Once seeded, the stable reference prevents the sync effect from re-firing.
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: async (event) => {
      const { message, messages: allMessages, isAbort, isError } = event
      setTimedOut(false)
      if (isAbort || isError) return

      const text = message.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('')

      const userInputText = allMessages
        .filter((m) => m.role === 'user')
        .pop()
        ?.parts?.filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('')

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed: AIResponse = JSON.parse(jsonMatch[0])
          if (parsed.isNewEntry && parsed.title !== undefined && parsed.title !== null) {
            const now = new Date().toISOString()
            const title = parsed.title || text.slice(0, 50).replace(/[{}"\n]/g, ' ').trim()

            if (parsed.type === 'habit') {
              const habitRes = await fetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: title,
                  description: parsed.summary || '',
                  frequency: 'daily',
                }),
              })
              if (!habitRes.ok) {
                console.error('Failed to save habit:', await habitRes.text())
              }
            } else {
              const note: Note = {
                id: genId(),
                content: userInputText || text,
                title,
                type: parsed.type,
                tags: parsed.tags,
                dueDate: parsed.dueDate,
                done: false,
                createdAt: now,
                updatedAt: now,
              }
              const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note),
              })
              if (res.ok) {
                const data = await res.json()
                onNoteCreated?.(data.note)
                console.log('Note saved:', title)
              } else {
                console.error('Failed to save note:', await res.text())
              }
            }
          }
        }

        // Save chat messages to history
        const unsaved = allMessages.slice(savedCountRef.current)
        if (unsaved.length > 0) {
          const now = new Date().toISOString()
          for (const m of unsaved) {
            const text = m.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
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
                  createdAt: now,
                }),
              })
            } catch (e) {
              console.error('Failed to save chat message:', e)
            }
          }
          savedCountRef.current = allMessages.length
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e)
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
    loadChatHistory()
  }, [])

  async function loadChatHistory() {
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

  function getMessageText(msg: typeof messages[0]): string {
    return msg.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('')
  }

  function extractAISummary(content: string): string {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed: AIResponse = JSON.parse(jsonMatch[0])
        return parsed.summary || content
      }
    } catch {
      // ignore
    }
    return content
  }

  function getTypeFromContent(content: string): string | undefined {
    try {
      const m = content.match(/\{[\s\S]*\}/)
      if (m) return JSON.parse(m[0]).type
    } catch { /* ignore */ }
    return undefined
  }

  function getTypeBadge(type?: string) {
    if (!type) return null
    return (
      <Badge className={typeColors[type] || ''} variant="outline">
        {typeLabels[type] || type}
      </Badge>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim() && status === 'ready') {
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

  const isLoading = status === 'streaming' || status === 'submitted'

  if (!chatInitialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">你好！我是你的 AI 生活助手</h2>
              <p className="text-sm text-muted-foreground">
                你可以这样和我对话：
              </p>
              <div className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
                <div className="rounded-lg bg-muted p-3">
                  &ldquo;明天下午3点和张三开会讨论项目进度&rdquo;
                </div>
                <div className="rounded-lg bg-muted p-3">
                  &ldquo;提醒我今晚8点锻炼&rdquo;
                </div>
                <div className="rounded-lg bg-muted p-3">
                  &ldquo;我想每天跑步&rdquo;
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const text = getMessageText(msg)

            if (isUser) {
              return (
                <div key={msg.id || i} className="flex justify-end">
                  <div className="flex max-w-[80%] flex-row-reverse gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Card className="bg-primary p-3 text-primary-foreground">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
                    </Card>
                  </div>
                </div>
              )
            }

            const summary = extractAISummary(text)
            return (
              <div key={msg.id || i} className="flex justify-start">
                <div className="flex max-w-[80%] gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <Card className="group relative bg-card p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
                      <button
                        onClick={() => handleCopy(text)}
                        className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-accent group-hover:block"
                        title="复制"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </Card>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {getTypeBadge(getTypeFromContent(text))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%] gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <Card className="bg-card p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">思考中</span>
                      <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    </div>
                  </Card>
                  {timedOut && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" />
                      DeepSeek 响应较慢，请稍候…
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <Card className="flex items-center gap-2 bg-destructive/10 p-3 text-sm text-destructive">
                <span>{error.message || '出错了'}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRetry}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl gap-2"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 200)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入你想记录的内容…"
            className="min-h-[44px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="h-[44px] w-[44px] shrink-0" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  )
}
