import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownRenderer } from '@/lib/markdown'

describe('MarkdownRenderer sanitization (stored-XSS defense)', () => {
  it('strips a <script> tag from the markdown', () => {
    const { container } = render(
      <MarkdownRenderer content={'<script>alert(1)</script>\n\n# Hello'} />
    )
    expect(container.querySelector('script')).toBeNull()
  })

  it('removes the onerror handler from inline HTML <img>', () => {
    const { container } = render(
      <MarkdownRenderer content={'<img src=x onerror=alert(1)>'} />
    )
    const img = container.querySelector('img')
    // rehype-sanitize either strips the img entirely or keeps it without onerror.
    // Either way, no element must carry a dangerous onerror handler.
    if (img) {
      expect(img.hasAttribute('onerror')).toBe(false)
    }
    expect(container.querySelector('[onerror]')).toBeNull()
  })

  it('strips javascript: URLs from links', () => {
    const { container } = render(
      <MarkdownRenderer content={'[link](javascript:alert(1))'} />
    )
    const anchor = container.querySelector('a')
    expect(anchor).toBeTruthy()
    const href = anchor!.getAttribute('href')
    expect(href).not.toBe('javascript:alert(1)')
  })

  it('renders normal markdown correctly', () => {
    const { container } = render(
      <MarkdownRenderer content={'# Heading\n\nThis is **bold** text'} />
    )
    const heading = container.querySelector('h1')
    expect(heading).toBeTruthy()
    expect(heading!.textContent).toBe('Heading')

    const strong = container.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong!.textContent).toBe('bold')
  })

  it('keeps target=_blank and rel=noopener noreferrer on safe external links', () => {
    const { container } = render(
      <MarkdownRenderer content={'[x](https://example.com)'} />
    )
    const anchor = container.querySelector('a')
    expect(anchor).toBeTruthy()
    expect(anchor!.getAttribute('href')).toBe('https://example.com')
    expect(anchor!.getAttribute('target')).toBe('_blank')
    expect(anchor!.getAttribute('rel')).toBe('noopener noreferrer')
  })
})
