/** 笔记类型（当前仅支持 'note'） */
export type NoteType = 'note'

/** 笔记附件数据结构 */
export interface Attachment {
  /** 唯一标识（UUID） */
  id: string
  /** 所属笔记 ID */
  noteId: string
  /** 文件名（含扩展名） */
  filename: string
  /** 附件访问 URL */
  url: string
  /** MIME 类型（如 image/png） */
  mimeType: string
  /** 文件大小（字节） */
  fileSize: number
  /** 创建时间（ISO 8601） */
  createdAt: string
}

/** 完整笔记数据结构 */
export interface Note {
  /** 唯一标识（UUID） */
  id: string
  /** Markdown 格式的笔记正文 */
  content: string
  /** 笔记标题（可为空） */
  title: string | null
  /** 笔记类型 */
  type: NoteType
  /** 标签列表 */
  tags: string[]
  /** 截止日期（ISO 8601，可为空） */
  dueDate: string | null
  /** 是否已完成 */
  done: boolean
  /** 创建时间（ISO 8601） */
  createdAt: string
  /** 最后更新时间（ISO 8601） */
  updatedAt: string
}


/** 月度预算数据结构 */
export interface Budget {
  /** 唯一标识（UUID） */
  id: string
  /** 预算月份（YYYY-MM 格式） */
  month: string
  /** 固定支出预算金额 */
  fixedBudget: number
  /** 可变支出预算金额 */
  variableBudget: number
  /** 固定支出实际金额（可为空） */
  fixedActual: number | null
  /** 可变支出实际金额（可为空） */
  variableActual: number | null
  /** 备注信息 */
  notes: string
  /** 本月预算是否已完成结算 */
  isCompleted: boolean
  /** 储蓄目标是否已完成 */
  savingsCompleted: boolean
  /** 创建时间（ISO 8601） */
  createdAt: string
  /** 最后更新时间（ISO 8601） */
  updatedAt: string
}

/** 习惯定义数据结构 */
export interface Habit {
  /** 唯一标识（UUID） */
  id: string
  /** 习惯名称 */
  name: string
  /** 习惯描述 */
  description: string
  /** 打卡频率：daily（每日）或 weekly（每周） */
  frequency: 'daily' | 'weekly'
  /** 创建时间（ISO 8601） */
  createdAt: string
}

/** 习惯打卡记录 */
export interface HabitCompletion {
  /** 唯一标识（UUID） */
  id: string
  /** 关联习惯 ID */
  habitId: string
  /** 打卡日期（YYYY-MM-DD 格式） */
  date: string
  /** 是否已完成打卡 */
  completed: boolean
  /** 创建时间（ISO 8601） */
  createdAt: string
}

/** 聊天消息数据结构 */
export interface ChatMessage {
  /** 唯一标识（UUID） */
  id: string
  /** 消息角色：用户或 AI 助手 */
  role: 'user' | 'assistant'
  /** 消息正文 */
  content: string
  /** 关联的笔记 ID（可为空） */
  relatedNoteId: string | null
  /** 所属对话 ID（可为空） */
  conversationId: string | null
  /** 创建时间（ISO 8601） */
  createdAt: string
}

/** 对话会话数据结构 */
export interface Conversation {
  /** 唯一标识（UUID） */
  id: string
  /** 对话标题 */
  title: string
  /** 创建时间（ISO 8601） */
  createdAt: string
  /** 最后更新时间（ISO 8601） */
  updatedAt: string
  /** 包含的消息数量 */
  messageCount: number
}


