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

  it('should display placeholder when content is empty', () => {
    render(<MarkdownEditor content="" onSave={vi.fn()} placeholder="写点什么..." />)
    expect(screen.getByPlaceholderText('写点什么...')).toBeInTheDocument()
  })

  it('should render default placeholder', () => {
    render(<MarkdownEditor content="" onSave={vi.fn()} />)
    expect(screen.getByPlaceholderText('开始写笔记...')).toBeInTheDocument()
  })

  // ─── Content Editing & Auto-Save ──────────────────────────────

  it('should update textarea on user input', () => {
    render(<MarkdownEditor content="" onSave={vi.fn()} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'new content' } })
    expect(textarea.value).toBe('new content')
  })

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

  it('should debounce multiple rapid changes', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="" onSave={onSave} />)
    const textarea = screen.getByRole('textbox')

    fireEvent.change(textarea, { target: { value: 'a' } })
    act(() => { vi.advanceTimersByTime(100) })
    fireEvent.change(textarea, { target: { value: 'ab' } })
    act(() => { vi.advanceTimersByTime(100) })
    fireEvent.change(textarea, { target: { value: 'abc' } })
    act(() => { vi.advanceTimersByTime(100) })

    // Should not have fired for intermediate values
    expect(onSave).not.toHaveBeenCalledWith('a')
    expect(onSave).not.toHaveBeenCalledWith('ab')

    // Only after full debounce window
    act(() => { vi.advanceTimersByTime(500) })
    expect(onSave).toHaveBeenCalledWith('abc')
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('should save immediately on toolbar action (no debounce)', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="hello" onSave={onSave} />)

    fireEvent.click(screen.getByTitle('粗体'))

    // Toolbar save is immediate: inserts `**` at cursor, producing `****hello`
    expect(onSave).toHaveBeenCalledWith('****hello')
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

  // ─── Toolbar: Heading ─────────────────────────────────────────

  it('should add heading markdown with newline separator', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="hello" onSave={onSave} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    // insertMarkdown('# ', '', true) → prefix='' + '# ' + suffix='\n'
    fireEvent.click(screen.getByTitle('标题'))
    expect(textarea.value).toBe('# \nhello')
    expect(onSave).toHaveBeenCalledWith('# \nhello')
  })

  it('should cycle heading levels correctly', () => {
    // Heading cycle: # hello → ## hello → ### hello → hello
    const onSave = vi.fn()
    const { rerender } = render(<MarkdownEditor content="# hello" onSave={onSave} />)
    const headingBtn = screen.getByTitle('标题')

    // # hello → ## hello (demote: prepend #)
    fireEvent.click(headingBtn)
    expect(onSave).toHaveBeenCalledWith('## hello')

    // Re-render with updated content for next state
    onSave.mockClear()
    rerender(<MarkdownEditor content="## hello" onSave={onSave} />)
    fireEvent.click(headingBtn)
    // ## hello → ### hello
    expect(onSave).toHaveBeenCalledWith('### hello')

    onSave.mockClear()
    rerender(<MarkdownEditor content="### hello" onSave={onSave} />)
    fireEvent.click(headingBtn)
    // ### hello → hello (remove heading prefix)
    expect(onSave).toHaveBeenCalledWith('hello')
  })

  // ─── Toolbar: List ────────────────────────────────────────────

  it('should insert list markdown with newline', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="item" onSave={onSave} />)

    fireEvent.click(screen.getByTitle('列表'))
    // insertMarkdown('- ', '', true) → '- \nitem'
    expect(onSave).toHaveBeenCalledWith('- \nitem')
  })

  // ─── Toolbar: Quote ───────────────────────────────────────────

  it('should insert quote markdown with newline', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="text" onSave={onSave} />)

    fireEvent.click(screen.getByTitle('引用'))
    // insertMarkdown('> ', '', true) → '> \ntext'
    expect(onSave).toHaveBeenCalledWith('> \ntext')
  })

  // ─── Toolbar: Link ────────────────────────────────────────────

  it('should insert link with placeholder text when nothing selected', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="text" onSave={onSave} />)

    fireEvent.click(screen.getByTitle('链接'))
    // insertMarkdown('[链接文字](url)') → '[链接文字](url)text'
    expect(onSave).toHaveBeenCalledWith('[链接文字](url)text')
  })

  // ─── Toolbar: Code ────────────────────────────────────────────

  it('should insert code backticks around cursor when no text selected', () => {
    const onSave = vi.fn()
    render(<MarkdownEditor content="hello" onSave={onSave} />)

    fireEvent.click(screen.getByTitle('代码'))
    // insertMarkdown('`', '`') with no selection → '``hello'
    expect(onSave).toHaveBeenCalledWith('``hello')
  })

  // ─── Toolbar: All buttons present ─────────────────────────────

  it('should render all toolbar buttons with correct titles', () => {
    render(<MarkdownEditor content="" onSave={vi.fn()} />)
    expect(screen.getByTitle('粗体')).toBeInTheDocument()
    expect(screen.getByTitle('标题')).toBeInTheDocument()
    expect(screen.getByTitle('列表')).toBeInTheDocument()
    expect(screen.getByTitle('引用')).toBeInTheDocument()
    expect(screen.getByTitle('链接')).toBeInTheDocument()
    expect(screen.getByTitle('代码')).toBeInTheDocument()
  })

  // ─── View Modes (Desktop) ─────────────────────────────────────

  it('should start in split view mode on desktop (editor + preview)', () => {
    render(<MarkdownEditor content="# Hello" onSave={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
  })

  it('should switch to edit-only view mode', () => {
    render(<MarkdownEditor content="# Hello" onSave={vi.fn()} />)
    fireEvent.click(screen.getByTitle('编辑'))
    // textarea still visible
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should show preview in preview-only mode', () => {
    render(<MarkdownEditor content="# Hello" onSave={vi.fn()} />)
    fireEvent.click(screen.getByTitle('预览'))
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
  })

  it('should show auto-save indicator on desktop', () => {
    render(<MarkdownEditor content="" onSave={vi.fn()} />)
    expect(screen.getByText('自动保存')).toBeInTheDocument()
  })

  it('should show empty preview text when content is empty on desktop', () => {
    render(<MarkdownEditor content="" onSave={vi.fn()} />)
    expect(screen.getByText('预览区域')).toBeInTheDocument()
  })

  // ─── Markdown Rendering ──────────────────────────────────────

  it('should render MarkdownRenderer in preview with correct content', () => {
    render(<MarkdownEditor content="**bold**" onSave={vi.fn()} />)
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('**bold**')
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

  it('should show empty preview on mobile when no content', () => {
    mockMatchMedia(false) // mobile
    render(<MarkdownEditor content="" onSave={vi.fn()} />)

    fireEvent.click(screen.getByTitle('预览'))
    expect(screen.getByText('预览')).toBeInTheDocument()
  })

  // ─── Lifecycle ───────────────────────────────────────────────

  it('should clear save timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = render(<MarkdownEditor content="test" onSave={vi.fn()} />)
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('should reset content when initialContent prop changes', () => {
    const { rerender } = render(<MarkdownEditor content="old" onSave={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('old')

    rerender(<MarkdownEditor content="new" onSave={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('new')
  })
})
