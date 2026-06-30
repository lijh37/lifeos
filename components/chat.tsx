'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useEffect, useRef } from 'react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Loader2, Copy, RefreshCw, Clock, Plus, MessageSquare, Trash2, ChevronLeft } from 'lucide-react'
import { SkeletonChat } from '@/components/skeleton-card'
import type { ChatMessage, Conversation } from '@/lib/types'
import { genId } from '@/lib/utils'

export default function Chat() {
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

      // Save chat messages
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

function getMessageText(msg: typeof messages[0]): string {
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

  const isLoading = status === 'streaming' || status === 'submitted'

  if (!chatInitialized) {
    return <SkeletonChat />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setShowSidebar(!showSidebar)}>
          <MessageSquare className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleNewConversation} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">新对话</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${showSidebar ? 'block' : 'hidden'} md:block w-56 shrink-0 border-r bg-muted/30`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">对话历史</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden" onClick={() => setShowSidebar(false)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  暂无对话记录
                </div>
              ) : (
                <div className="space-y-0.5 p-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        activeConversationId === conv.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handleSelectConversation(conv.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-xs">{conv.title}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{conv.messageCount}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id) }}
                        className="hidden shrink-0 text-destructive hover:text-destructive group-hover:block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
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
                      &ldquo;找一下关于电影方面的笔记&rdquo;
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      &ldquo;我上周写了什么&rdquo;
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      &ldquo;这个月的预算情况&rdquo;
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

                return (
                  <div key={msg.id || i} className="flex justify-start">
                    <div className="flex max-w-[80%] gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <Card className="group relative bg-card p-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
                          <button
                            onClick={() => handleCopy(text)}
                            className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-accent group-hover:block"
                            title="复制"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </Card>
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
                className="min-h-[44px] resize-none text-base sm:text-sm"
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
      </div>
    </div>
  )
}
