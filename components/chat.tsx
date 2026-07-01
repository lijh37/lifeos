'use client'

import { ChatProvider, useChatContext } from './chat-context'
import { ConversationSidebar } from './conversation-sidebar'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { Button } from '@/components/ui/button'
import { SkeletonChat } from '@/components/skeleton-card'
import { MessageSquare, Plus } from 'lucide-react'

function ChatInner() {
  const { chatInitialized, showSidebar, setShowSidebar, handleNewConversation } = useChatContext()

  if (!chatInitialized) {
    return <SkeletonChat />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleNewConversation} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">新对话</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar />
        <div className="flex flex-1 flex-col">
          <MessageList />
          <ChatInput />
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  return (
    <ChatProvider>
      <ChatInner />
    </ChatProvider>
  )
}
