import { NextRequest } from 'next/server'
import { getRecentChatMessages, getChatMessagesByConversation, saveChatMessage } from '@/lib/db'
import type { ChatMessage } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversation_id')

    const messages = conversationId
      ? await getChatMessagesByConversation(conversationId)
      : await getRecentChatMessages(50)

    return Response.json({ messages })
  } catch (error) {
    console.error('Failed to load chat history:', error)
    return Response.json({ messages: [] })
  }
}

export async function POST(req: Request) {
  try {
    const msg: ChatMessage = await req.json()
    await saveChatMessage(msg)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Failed to save chat message:', error)
    return Response.json({ ok: false }, { status: 500 })
  }
}
