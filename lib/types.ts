/** 未分类标签的常量标识（客户端与服务端共享，置于无 DB 依赖的模块） */
export const UNTAGGED = '__untagged__'

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
  type: 'note'
  /** 标签列表 */
  tags: string[]
  /** 截止日期（ISO 8601，可为空） */
  dueDate: string | null
  /** 是否已完成 */
  done: boolean
  /** 是否已置顶 */
  pinned: boolean
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



