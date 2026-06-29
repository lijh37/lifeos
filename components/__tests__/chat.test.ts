import { describe, it, expect } from 'vitest'

// Import the AIResponse type for type checking
import type { AIResponse } from '@/lib/types'

describe('AI Response JSON Parsing', () => {
  // Helper functions that replicate the chat component's logic
  function extractJson(text: string): AIResponse | null {
    try {
      const clean = text.replace(/^`+json\s*|`+$/gm, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AIResponse
      }
    } catch {
      // ignore
    }
    return null
  }

  function extractSummary(content: string): string {
    const parsed = extractJson(content)
    return parsed?.summary || content
  }

  function extractType(content: string): string | undefined {
    const parsed = extractJson(content)
    return parsed?.type
  }

  describe('extractJson', () => {
    it('should parse a valid JSON AI response', () => {
      const input = '{"type":"note","title":"测试笔记","tags":["工作"],"dueDate":null,"summary":"已创建笔记","isNewEntry":true}'
      const result = extractJson(input)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('note')
      expect(result!.title).toBe('测试笔记')
      expect(result!.tags).toEqual(['工作'])
      expect(result!.isNewEntry).toBe(true)
    })

    it('should handle JSON inside backtick fences', () => {
      const input = '```json\n{"type":"task","title":"完成任务","tags":[],"dueDate":null,"summary":"已创建","isNewEntry":true}\n```'
      const result = extractJson(input)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('task')
    })

    it('should handle JSON with surrounding text', () => {
      const input = '好的，已为您创建。{"type":"event","title":"开会","tags":["工作"],"dueDate":"2026-06-30T14:00:00","summary":"已创建事件","isNewEntry":true}'
      const result = extractJson(input)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('event')
      expect(result!.dueDate).toBe('2026-06-30T14:00:00')
    })

    it('should handle mixed text before JSON', () => {
      const input = '好的，我理解了。{"type":"habit","title":"每天读书","tags":["学习"],"dueDate":null,"summary":"已创建习惯","isNewEntry":true} 记得坚持打卡！'
      const result = extractJson(input)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('habit')
      expect(result!.title).toBe('每天读书')
    })

    it('should return null for non-JSON content', () => {
      const input = '你好，今天过得怎么样？'
      const result = extractJson(input)
      expect(result).toBeNull()
    })

    it('should return null for malformed JSON', () => {
      const input = '{"type":"note","title":"test"'
      const result = extractJson(input)
      expect(result).toBeNull()
    })
  })

  describe('extractSummary', () => {
    it('should return summary from JSON', () => {
      const input = '{"type":"note","title":"测试","tags":[],"dueDate":null,"summary":"已创建成功","isNewEntry":true}'
      expect(extractSummary(input)).toBe('已创建成功')
    })

    it('should return original content if no JSON found', () => {
      const input = '普通的聊天回复'
      expect(extractSummary(input)).toBe('普通的聊天回复')
    })
  })

  describe('extractType', () => {
    it('should return type from JSON', () => {
      const input = '{"type":"task","title":"测试","tags":[],"dueDate":null,"summary":"ok","isNewEntry":true}'
      expect(extractType(input)).toBe('task')
    })

    it('should return undefined for non-JSON', () => {
      expect(extractType('hello')).toBeUndefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle newlines in JSON', () => {
      const input = `{"type":"note","title":"多行","tags":["work"],"dueDate":null,"summary":"line1\\nline2","isNewEntry":true}`
      const result = extractJson(input)
      expect(result).not.toBeNull()
      expect(result!.title).toBe('多行')
    })

    it('should handle all 4 entry types', () => {
      const types = ['note', 'task', 'event', 'habit']
      for (const type of types) {
        const json = `{"type":"${type}","title":"test","tags":[],"dueDate":null,"summary":"","isNewEntry":true}`
        expect(extractType(json)).toBe(type)
      }
    })

    it('should accept isNewEntry as false', () => {
      const input = '{"type":"note","title":"","tags":[],"dueDate":null,"summary":"just chatting","isNewEntry":false}'
      const result = extractJson(input)
      expect(result).not.toBeNull()
      expect(result!.isNewEntry).toBe(false)
    })
  })
})
