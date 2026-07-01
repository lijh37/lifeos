// IMPORTANT: Set env BEFORE importing db
process.env.DATABASE_URL = ':memory:'

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDB, getClient, createConversation, getConversations, updateConversationTitle, deleteConversation, saveChatMessage, getRecentChatMessages, getChatMessagesByConversation } from '@/lib/db'

describe('Database - Conversations', () => {
  beforeAll(async () => {
    await initDB()
  })

  beforeEach(async () => {
    const client = getClient()
    await client.execute('DELETE FROM chat_messages')
    await client.execute('DELETE FROM conversations')
  })

  it('should create and list conversations', async () => {
    const id1 = crypto.randomUUID()
    const id2 = crypto.randomUUID()
    await createConversation(id1, 'First conversation')
    // Small delay so updated_at differs
    await new Promise(r => setTimeout(r, 10))
    await createConversation(id2, 'Second conversation')

    const conversations = await getConversations()
    expect(conversations).toHaveLength(2)
    // Should be sorted by updated_at DESC — second created later comes first
    expect(conversations[0].id).toBe(id2)
    expect(conversations[0].title).toBe('Second conversation')
    expect(conversations[1].id).toBe(id1)
    expect(conversations[1].title).toBe('First conversation')
  })

  it('should return empty array when no conversations', async () => {
    const conversations = await getConversations()
    expect(conversations).toEqual([])
  })

  it('should update conversation title', async () => {
    const id = crypto.randomUUID()
    await createConversation(id, 'Original Title')

    await updateConversationTitle(id, 'Updated Title')

    const conversations = await getConversations()
    expect(conversations).toHaveLength(1)
    expect(conversations[0].title).toBe('Updated Title')
  })

  it('should delete a conversation and its messages', async () => {
    const convId = crypto.randomUUID()
    await createConversation(convId, 'To be deleted')

    // Add messages to the conversation
    const msgId1 = crypto.randomUUID()
    const msgId2 = crypto.randomUUID()
    await saveChatMessage({
      id: msgId1,
      role: 'user',
      content: 'Hello',
      relatedNoteId: null,
      conversationId: convId,
      createdAt: new Date().toISOString(),
    })
    await saveChatMessage({
      id: msgId2,
      role: 'assistant',
      content: 'Hi there',
      relatedNoteId: null,
      conversationId: convId,
      createdAt: new Date().toISOString(),
    })

    // Verify messages exist
    const messagesBefore = await getChatMessagesByConversation(convId)
    expect(messagesBefore).toHaveLength(2)

    // Delete conversation
    await deleteConversation(convId)

    // Verify conversation is gone
    const conversations = await getConversations()
    expect(conversations).toHaveLength(0)

    // Verify messages are gone too
    const messagesAfter = await getChatMessagesByConversation(convId)
    expect(messagesAfter).toHaveLength(0)
  })
})

describe('Database - Chat Messages', () => {
  beforeAll(async () => {
    await initDB()
  })

  beforeEach(async () => {
    const client = getClient()
    await client.execute('DELETE FROM chat_messages')
    await client.execute('DELETE FROM conversations')
  })

  it('should save and retrieve recent messages', async () => {
    const convId = crypto.randomUUID()
    await createConversation(convId, 'Test conv')

    const messages = [
      { id: crypto.randomUUID(), role: 'user' as const, content: 'Message 1', relatedNoteId: null, conversationId: convId, createdAt: new Date('2026-01-01T00:00:00Z').toISOString() },
      { id: crypto.randomUUID(), role: 'assistant' as const, content: 'Message 2', relatedNoteId: null, conversationId: convId, createdAt: new Date('2026-01-01T00:01:00Z').toISOString() },
      { id: crypto.randomUUID(), role: 'user' as const, content: 'Message 3', relatedNoteId: null, conversationId: convId, createdAt: new Date('2026-01-01T00:02:00Z').toISOString() },
    ]

    for (const msg of messages) {
      await saveChatMessage(msg)
    }

    const recent = await getRecentChatMessages()
    expect(recent).toHaveLength(3)
  })

  it('should filter messages by conversation_id', async () => {
    const convId1 = crypto.randomUUID()
    const convId2 = crypto.randomUUID()
    await createConversation(convId1, 'Conversation A')
    await createConversation(convId2, 'Conversation B')

    await saveChatMessage({ id: crypto.randomUUID(), role: 'user', content: 'Msg in A', relatedNoteId: null, conversationId: convId1, createdAt: new Date().toISOString() })
    await saveChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: 'Reply in A', relatedNoteId: null, conversationId: convId1, createdAt: new Date().toISOString() })
    await saveChatMessage({ id: crypto.randomUUID(), role: 'user', content: 'Msg in B', relatedNoteId: null, conversationId: convId2, createdAt: new Date().toISOString() })

    const conv1Messages = await getChatMessagesByConversation(convId1)
    expect(conv1Messages).toHaveLength(2)
    expect(conv1Messages[0].content).toBe('Msg in A')
    expect(conv1Messages[1].content).toBe('Reply in A')

    const conv2Messages = await getChatMessagesByConversation(convId2)
    expect(conv2Messages).toHaveLength(1)
    expect(conv2Messages[0].content).toBe('Msg in B')
  })

  it('should save message with relatedNoteId', async () => {
    const msgId = crypto.randomUUID()
    const noteId = crypto.randomUUID()
    const convId = crypto.randomUUID()
    await createConversation(convId, 'Test')

    await saveChatMessage({
      id: msgId,
      role: 'assistant',
      content: 'Related to note',
      relatedNoteId: noteId,
      conversationId: convId,
      createdAt: new Date().toISOString(),
    })

    const messages = await getRecentChatMessages()
    expect(messages).toHaveLength(1)
    expect(messages[0].relatedNoteId).toBe(noteId)
    expect(messages[0].content).toBe('Related to note')
  })

  it('should return messages in chronological order', async () => {
    const convId = crypto.randomUUID()
    await createConversation(convId, 'Test')

    // Insert messages out of order (but with correct timestamps)
    const msg1 = { id: crypto.randomUUID(), role: 'user' as const, content: 'Earliest', relatedNoteId: null, conversationId: convId, createdAt: new Date('2026-06-01T00:00:00Z').toISOString() }
    const msg3 = { id: crypto.randomUUID(), role: 'assistant' as const, content: 'Latest', relatedNoteId: null, conversationId: convId, createdAt: new Date('2026-06-01T00:02:00Z').toISOString() }
    const msg2 = { id: crypto.randomUUID(), role: 'user' as const, content: 'Middle', relatedNoteId: null, conversationId: convId, createdAt: new Date('2026-06-01T00:01:00Z').toISOString() }

    // Save in shuffled order: msg1, msg3, msg2
    await saveChatMessage(msg1)
    await saveChatMessage(msg3)
    await saveChatMessage(msg2)

    const messages = await getChatMessagesByConversation(convId)
    expect(messages).toHaveLength(3)
    expect(messages[0].content).toBe('Earliest')
    expect(messages[1].content).toBe('Middle')
    expect(messages[2].content).toBe('Latest')

    // Also verify getRecentChatMessages returns them in order
    const recent = await getRecentChatMessages()
    expect(recent[0].content).toBe('Earliest')
    expect(recent[1].content).toBe('Middle')
    expect(recent[2].content).toBe('Latest')
  })
})
