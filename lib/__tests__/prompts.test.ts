import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPT } from '@/lib/prompts'

describe('SYSTEM_PROMPT', () => {
  it('should reference the available tools', () => {
    expect(SYSTEM_PROMPT).toContain('createEntry')
    expect(SYSTEM_PROMPT).toContain('createHabit')
  })

  it('should list all 7 tools', () => {
    expect(SYSTEM_PROMPT).toContain('createEntry')
    expect(SYSTEM_PROMPT).toContain('createHabit')
    expect(SYSTEM_PROMPT).toContain('searchNotesByKeyword')
    expect(SYSTEM_PROMPT).toContain('searchHabitsByKeyword')
    expect(SYSTEM_PROMPT).toContain('getNotesInDateRange')
    expect(SYSTEM_PROMPT).toContain('getHabitProgress')
    expect(SYSTEM_PROMPT).toContain('getBudgetInfo')
  })

  it('should describe entry creation parameters', () => {
    expect(SYSTEM_PROMPT).toContain('类型')
    expect(SYSTEM_PROMPT).toContain('标题')
    expect(SYSTEM_PROMPT).toContain('标签')
    expect(SYSTEM_PROMPT).toContain('到期时间')
  })

  it('should support all entry types', () => {
    expect(SYSTEM_PROMPT).toContain('笔记')
    expect(SYSTEM_PROMPT).toContain('任务')
    expect(SYSTEM_PROMPT).toContain('事件')
    expect(SYSTEM_PROMPT).toContain('习惯')
  })

  it('should describe query tools usage', () => {
    expect(SYSTEM_PROMPT).toContain('查一下关于会议的笔记')
    expect(SYSTEM_PROMPT).toContain('找一下跑步相关的习惯')
    expect(SYSTEM_PROMPT).toContain('我上周做了什么')
    expect(SYSTEM_PROMPT).toContain('我的习惯打卡情况')
    expect(SYSTEM_PROMPT).toContain('我这个月的预算还剩多少')
  })

  it('should not contain markdown code fences', () => {
    expect(SYSTEM_PROMPT).not.toContain('```')
  })

  it('should be a non-empty string longer than 100 chars', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100)
  })
})
