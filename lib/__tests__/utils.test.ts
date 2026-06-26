import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('should handle tailwind conflicts', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('should handle null and undefined', () => {
    expect(cn('a', null, undefined, 'b')).toBe('a b')
  })
})
