import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MarkdownEditor } from '@/components/markdown-editor'

// Mock MarkdownRenderer
vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}))

// Mock matchMedia for responsive detection (default: desktop)
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('MarkdownEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    mockMatchMedia(true) // desktop default
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── Basic Rendering ───────────────────────────────────────────

  it('should render with initial content', () => {
    render(<MarkdownEditor content="# Hello" onSave={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('# Hello')
  })

  // ─── Content Editing & Auto-Save ──────────────────────────────

  it('should call onSave after debounce delay on content change', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="" onSave={onSave} />)
    const textarea = screen.getByRole('textbox')

    fireEvent.change(textarea, { target: { value: 'hello' } })
    // Should NOT have called immediately
    expect(onSave).not.toHaveBeenCalled()

    // Advance past the 500ms debounce
    act(() => { vi.advanceTimersByTime(500) })
    expect(onSave).toHaveBeenCalledWith('hello')
  })

  // ─── Toolbar: Bold ────────────────────────────────────────────

  it('should insert bold markdown at cursor when no text selected', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="hello" onSave={onSave} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    // Cursor at position 0, no selection
    fireEvent.click(screen.getByTitle('粗体'))

    // `**` inserted at cursor + `**` after → `****hello`
    expect(textarea.value).toBe('****hello')
  })

  // ─── View Modes (Desktop) ─────────────────────────────────────

  it('should start in split view mode on desktop (editor + preview)', () => {
    render(<MarkdownEditor content="# Hello" onSave={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
  })

  it('should show preview in preview-only mode', () => {
    render(<MarkdownEditor content="# Hello" onSave={vi.fn()} />)
    fireEvent.click(screen.getByTitle('预览'))
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
  })

  // ─── Mobile Variant ──────────────────────────────────────────

  it('should render mobile variant when screen is small', () => {
    mockMatchMedia(false) // mobile
    render(<MarkdownEditor content="mobile" onSave={vi.fn()} />)

    // Mobile has edit/preview tabs
    expect(screen.getByTitle('编辑')).toBeInTheDocument()
    expect(screen.getByTitle('预览')).toBeInTheDocument()

    // Textarea visible in edit mode
    expect(screen.getByRole('textbox')).toHaveValue('mobile')

    // Switch to preview
    fireEvent.click(screen.getByTitle('预览'))
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('mobile')
  })

  // ─── Lifecycle ───────────────────────────────────────────────

  it('should clear save timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = render(<MarkdownEditor content="test" onSave={vi.fn()} />)
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
