'use client'

import { memo } from 'react'
import type { UIMessage } from 'ai'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, User, Clock, RefreshCw, Copy } from 'lucide-react'
import { useChatContext } from './chat-context'

const UserMessage = memo(function UserMessage({
  msg,
  getMessageText,
}: {
  msg: UIMessage
  getMessageText: (msg: UIMessage) => string
}) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[80%] flex-row-reverse gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <Card className="bg-primary p-3 text-primary-foreground">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{getMessageText(msg)}</p>
        </Card>
      </div>
    </div>
  )
})
UserMessage.displayName = 'UserMessage'

const AssistantMessage = memo(function AssistantMessage({
  msg,
  getMessageText,
  handleCopy,
}: {
  msg: UIMessage
  getMessageText: (msg: UIMessage) => string
  handleCopy: (text: string) => void
}) {
  const text = getMessageText(msg)
  return (
    <div className="flex justify-start">
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
})
AssistantMessage.displayName = 'AssistantMessage'

export function MessageList() {
  const {
    messages,
    status,
    error,
    timedOut,
    scrollRef,
    handleCopy,
    handleRetry,
    getMessageText,
  } = useChatContext()

  const isLoading = status === 'streaming' || status === 'submitted'

  return (
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
              <div className="rounded-lg bg-muted p-3 transition-colors hover:bg-accent hover:text-accent-foreground cursor-default">
                &ldquo;找一下关于电影方面的笔记&rdquo;
              </div>
              <div className="rounded-lg bg-muted p-3 transition-colors hover:bg-accent hover:text-accent-foreground cursor-default">
                &ldquo;我上周写了什么&rdquo;
              </div>
              <div className="rounded-lg bg-muted p-3 transition-colors hover:bg-accent hover:text-accent-foreground cursor-default">
                &ldquo;这个月的预算情况&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'

          if (isUser) {
            return <UserMessage key={msg.id || i} msg={msg} getMessageText={getMessageText} />
          }

          return <AssistantMessage key={msg.id || i} msg={msg} getMessageText={getMessageText} handleCopy={handleCopy} />
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
  )
}
