import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPT } from '@/lib/prompts'

describe('SYSTEM_PROMPT', () => {
  it('should contain the JSON format fields', () => {
    expect(SYSTEM_PROMPT).toContain('"type"')
    expect(SYSTEM_PROMPT).toContain('"title"')
    expect(SYSTEM_PROMPT).toContain('"summary"')
    expect(SYSTEM_PROMPT).toContain('"isNewEntry"')
  })

  it('should support all 4 entry types', () => {
    expect(SYSTEM_PROMPT).toContain('note')
    expect(SYSTEM_PROMPT).toContain('task')
    expect(SYSTEM_PROMPT).toContain('event')
    expect(SYSTEM_PROMPT).toContain('habit')
  })

  it('should not contain markdown code fences', () => {
    expect(SYSTEM_PROMPT).not.toContain('```')
  })

  it('should be a non-empty string longer than 100 chars', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100)
  })
})
