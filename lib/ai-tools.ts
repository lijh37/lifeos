import { tool } from 'ai'
import { z } from 'zod'
import { createNote, searchNotes, searchHabits, getNotesByDateRange, getHabits, getStreaks, getBudget, initDB } from './db'
import { genId } from './utils'
import type { NoteType } from './types'

export const createEntry = tool({
  description: '当用户请求创建笔记、任务或事件时使用。根据用户输入提取类型、标题、标签和日期，直接创建记录。',
  inputSchema: z.object({
    type: z.enum(['note', 'task', 'event']).describe('记录类型：note=笔记, task=任务, event=事件'),
    title: z.string().min(1).describe('提取的简短标题'),
    content: z.string().describe('用户的原始输入内容'),
    tags: z.array(z.string()).describe('自动打标签，如 ["工作","会议"]、["健康","饮食"] 等'),
    dueDate: z.string().nullable().describe('如果提到了具体时间，解析为 ISO 日期字符串，否则为 null'),
  }),
  execute: async ({ type, title, content, tags, dueDate }) => {
    const now = new Date().toISOString()
    const note = {
      id: genId(),
      content,
      title,
      type: type as NoteType,
      tags,
      dueDate,
      done: false,
      createdAt: now,
      updatedAt: now,
    }
    await initDB()
    const saved = await createNote(note)
    return {
      success: true,
      id: saved.id,
      type: saved.type,
      title: saved.title,
      summary: `已创建${type === 'task' ? '任务' : type === 'event' ? '事件' : '笔记'}：${title}`,
    }
  },
})

export const createHabit = tool({
  description: '当用户请求创建习惯时使用。提取习惯名称、描述和频率。',
  inputSchema: z.object({
    name: z.string().min(1).describe('习惯名称，如 "每天跑步"、"读书30分钟"'),
    description: z.string().describe('习惯的详细描述或用户原话'),
    frequency: z.enum(['daily', 'weekly']).describe('习惯频率：daily=每天, weekly=每周'),
    tags: z.array(z.string()).describe('习惯分类标签，如 ["健康"]、["学习"]'),
  }),
  execute: async ({ name, description, frequency, tags }) => {
    const db = (await import('./db')).getClient()
    const id = genId()
    const now = new Date().toISOString()
    await db.execute({
      sql: 'INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, name, description, frequency, now],
    })
    return {
      success: true,
      id,
      name,
      summary: `已创建习惯：${name}，记得${frequency === 'daily' ? '每天' : '每周'}打卡哦！`,
    }
  },
})

// --- Query tools ---

export const searchNotesByKeyword = tool({
  description: '搜索笔记、任务或事件。根据关键词搜索标题和内容，返回匹配的记录列表。',
  inputSchema: z.object({
    query: z.string().min(1).describe('搜索关键词，如 "会议"、"跑步"、"项目"'),
  }),
  execute: async ({ query }) => {
    await initDB()
    const results = await searchNotes(query)
    if (results.length === 0) {
      return { count: 0, results: [], summary: `未找到与 "${query}" 相关的记录。` }
    }
    return {
      count: results.length,
      results: results.slice(0, 20).map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
        done: n.done,
        createdAt: n.createdAt,
      })),
      summary: `找到 ${results.length} 条与 "${query}" 相关的记录。`,
    }
  },
})

export const searchHabitsByKeyword = tool({
  description: '搜索习惯。根据关键词搜索习惯名称和描述。',
  inputSchema: z.object({
    query: z.string().min(1).describe('搜索关键词，如 "跑步"、"读书"'),
  }),
  execute: async ({ query }) => {
    await initDB()
    const results = await searchHabits(query)
    if (results.length === 0) {
      return { count: 0, results: [], summary: `未找到与 "${query}" 相关的习惯。` }
    }
    return {
      count: results.length,
      results: results.map(h => ({
        id: h.id,
        name: h.name,
        frequency: h.frequency,
        createdAt: h.createdAt,
      })),
      summary: `找到 ${results.length} 个与 "${query}" 相关的习惯。`,
    }
  },
})

export const getNotesInDateRange = tool({
  description: '按日期范围查询笔记、任务或事件。查询一段时间内创建的记录。',
  inputSchema: z.object({
    startDate: z.string().describe('开始日期，ISO 格式如 "2026-06-01"'),
    endDate: z.string().describe('结束日期，ISO 格式如 "2026-06-30"'),
    type: z.enum(['note', 'task', 'event']).optional().describe('可选，过滤记录类型'),
  }),
  execute: async ({ startDate, endDate, type }) => {
    await initDB()
    const results = await getNotesByDateRange(startDate, endDate, type)
    if (results.length === 0) {
      return { count: 0, results: [], summary: `在 ${startDate} 到 ${endDate} 之间没有找到记录。` }
    }
    return {
      count: results.length,
      results: results.slice(0, 30).map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
        done: n.done,
        createdAt: n.createdAt,
      })),
      summary: `在 ${startDate} 到 ${endDate} 之间找到 ${results.length} 条记录。`,
    }
  },
})

export const getHabitProgress = tool({
  description: '查询所有习惯及其连续打卡天数。返回习惯列表和当前的连续打卡记录。',
  inputSchema: z.object({}),
  execute: async () => {
    await initDB()
    const habits = await getHabits()
    const streaks = await getStreaks()
    const results = habits.map(h => ({
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      streak: streaks[h.id] || 0,
    }))
    if (results.length === 0) {
      return { count: 0, results: [], summary: '还没有创建任何习惯，开始创建一个吧！' }
    }
    return {
      count: results.length,
      results,
      summary: `共有 ${results.length} 个习惯。${results.map(h => `${h.name}(${h.streak}天)`).join('、')}`,
    }
  },
})

export const getBudgetInfo = tool({
  description: '查询某个月的预算情况。传入月份（格式 YYYY-MM），返回预算和实际支出。',
  inputSchema: z.object({
    month: z.string().describe('月份，格式如 "2026-06"'),
  }),
  execute: async ({ month }) => {
    await initDB()
    const budget = await getBudget(month)
    if (!budget) {
      return { exists: false, summary: `${month} 还没有设置预算。` }
    }
    return {
      exists: true,
      fixedBudget: budget.fixedBudget,
      variableBudget: budget.variableBudget,
      fixedActual: budget.fixedActual,
      variableActual: budget.variableActual,
      isCompleted: budget.isCompleted,
      summary: `${month} 预算：固定支出 ${budget.fixedBudget}元${budget.fixedActual !== null ? `，已支出 ${budget.fixedActual}元` : ''}；可变支出 ${budget.variableBudget}元${budget.variableActual !== null ? `，已支出 ${budget.variableActual}元` : ''}`,
    }
  },
})

export const tools = {
  createEntry,
  createHabit,
  searchNotesByKeyword,
  searchHabitsByKeyword,
  getNotesInDateRange,
  getHabitProgress,
  getBudgetInfo,
}
