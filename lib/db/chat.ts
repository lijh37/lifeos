import type { ChatMessage } from '../types'
import { getClient } from './client'

/**
 * 创建或替换一个对话会话。
 * @param id - 会话 ID
 * @param title - 会话标题
 */
export async function createConversation(id: string, title: string): Promise<void> {
  const db = getClient()
  const now = new Date().toISOString()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    args: [id, title, now, now],
  })
}

/**
 * 获取所有对话会话列表，按更新时间降序排列，附带每条对话的消息数。
 * @returns 对话数组，包含 id、标题、时间戳和消息计数
 */
export async function getConversations(): Promise<{ id: string; title: string; createdAt: string; updatedAt: string; messageCount: number }[]> {
  const db = getClient()
  const result = await db.execute(`
    SELECT c.id, c.title, c.created_at, c.updated_at,
      (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
    FROM conversations c ORDER BY c.updated_at DESC
  `)
  return result.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    messageCount: r.message_count as number,
  }))
}

/**
 * 删除指定对话及其所有关联的聊天消息。
 * @param id - 要删除的对话 ID
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM conversations WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM chat_messages WHERE conversation_id = ?', args: [id] })
}

/**
 * 更新指定对话的标题和更新时间。
 * @param id - 对话 ID
 * @param title - 新标题
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?',
    args: [title, new Date().toISOString(), id],
  })
}

/**
 * 保存一条聊天消息到数据库（插入或替换）。
 * @param msg - 聊天消息对象
 */
export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO chat_messages (id, role, content, related_note_id, conversation_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [msg.id, msg.role, msg.content, msg.relatedNoteId, msg.conversationId, msg.createdAt],
  })
}

/**
 * 获取最近的聊天消息，按时间升序排列。
 * @param limit - 返回条数上限（默认 50）
 * @returns 聊天消息数组
 */
export async function getRecentChatMessages(limit = 50): Promise<ChatMessage[]> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?',
    args: [limit],
  })
  return result.rows.map(row => ({
    id: row.id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    relatedNoteId: row.related_note_id as string | null,
    conversationId: row.conversation_id as string | null,
    createdAt: row.created_at as string,
  }))
}

/**
 * 获取指定对话的所有聊天消息，按时间升序排列。
 * @param conversationId - 对话 ID
 * @returns 聊天消息数组
 */
export async function getChatMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    args: [conversationId],
  })
  return result.rows.map(row => ({
    id: row.id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    relatedNoteId: row.related_note_id as string | null,
    conversationId: row.conversation_id as string | null,
    createdAt: row.created_at as string,
  }))
}

/**
 * 清空所有聊天消息记录。
 */
export async function clearChatMessages(): Promise<void> {
  const db = getClient()
  await db.execute('DELETE FROM chat_messages')
}

/**
 * 清空指定表的所有数据（仅限白名单表：notes、budgets、habits、habit_completions、chat_messages）。
 * @param table - 表名
 * @throws 如果表名不在白名单中则抛出错误
 */
export async function clearTable(table: string): Promise<void> {
  const db = getClient()
  const allowed = ['notes', 'budgets', 'habits', 'habit_completions', 'chat_messages']
  if (!allowed.includes(table)) throw new Error(`Table '${table}' not allowed for clearing`)
  await db.execute(`DELETE FROM ${table}`)
}
