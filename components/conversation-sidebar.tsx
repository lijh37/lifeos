'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, ChevronLeft, Loader2, Trash2 } from 'lucide-react'
import { useChatContext } from './chat-context'

const ConversationSidebar = memo(function ConversationSidebar() {
  const {
    conversations,
    loadingConversations,
    activeConversationId,
    showSidebar,
    setShowSidebar,
    handleSelectConversation,
    handleDeleteConversation,
  } = useChatContext()

  return (
    <div
      className={`${showSidebar ? 'block' : 'hidden'} md:block w-56 shrink-0 border-r bg-muted/30`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">对话历史</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 md:hidden"
            onClick={() => setShowSidebar(false)}
          >
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
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {conv.messageCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteConversation(conv.id)
                    }}
                    className="shrink-0 text-destructive/50 hover:text-destructive transition-all duration-200 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
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
  )
})
ConversationSidebar.displayName = 'ConversationSidebar'

export { ConversationSidebar }
