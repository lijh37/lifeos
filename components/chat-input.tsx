'use client'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { useChatContext } from './chat-context'

export function ChatInput() {
  const { input, setInput, status, textareaRef, handleSubmit, handleKeyDown } = useChatContext()
  const isLoading = status === 'streaming' || status === 'submitted'

  return (
    <div className="border-t bg-background p-3 sm:p-4">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2">
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
          placeholder="搜索笔记、习惯、预算，直接问我…"
          className="min-h-[44px] resize-none text-base sm:text-sm"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="h-[44px] w-[44px] shrink-0 transition-all duration-200 disabled:opacity-40"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
      <p className="mt-1 text-center text-xs text-muted-foreground/60">
        Enter 发送 · Shift+Enter 换行
      </p>
    </div>
  )
}
