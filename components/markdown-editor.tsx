'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Bold,
  Heading2,
  List,
  Quote,
  Link,
  Code,
  Eye,
  Edit3,
  Columns2,
} from 'lucide-react'
import { MarkdownRenderer } from '@/lib/markdown'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  content: string
  onSave: (content: string) => void
  placeholder?: string
}

type ToolbarAction = 'bold' | 'heading' | 'list' | 'quote' | 'link' | 'code'

const TOOLBAR_ITEMS: { action: ToolbarAction; icon: typeof Bold; title: string }[] = [
  { action: 'bold', icon: Bold, title: '粗体' },
  { action: 'heading', icon: Heading2, title: '标题' },
  { action: 'list', icon: List, title: '列表' },
  { action: 'quote', icon: Quote, title: '引用' },
  { action: 'link', icon: Link, title: '链接' },
  { action: 'code', icon: Code, title: '代码' },
]

const MarkdownEditor = memo(function MarkdownEditor({ content: initialContent, onSave, placeholder = '开始写笔记...' }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [showingPreview, setShowingPreview] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const savedContent = useRef(initialContent)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // Responsive detection
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Reset when initialContent changes
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  // Auto-save with debounce
  const scheduleSave = useCallback((newContent: string) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      savedContent.current = newContent
      onSaveRef.current(newContent)
    }, 500)
  }, [])

  useEffect(() => {
    return () => clearTimeout(saveTimer.current)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newContent = e.target.value
    setContent(newContent)
    if (newContent !== savedContent.current) {
      scheduleSave(newContent)
    }
  }

  function insertMarkdown(before: string, after = '', extraNewline = false) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    const prefix = extraNewline && start > 0 && content[start - 1] !== '\n' ? '\n' : ''
    const suffix = extraNewline ? '\n' : ''
    const newText = content.substring(0, start) + prefix + before + selected + after + suffix + content.substring(end)
    setContent(newText)
    savedContent.current = newText // immediate save on toolbar action
    onSaveRef.current(newText)
    clearTimeout(saveTimer.current)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + prefix.length + before.length
      if (selected) {
        textarea.setSelectionRange(cursorPos, cursorPos + selected.length)
      } else {
        textarea.setSelectionRange(cursorPos, cursorPos)
      }
    })
  }

  function handleToolbar(action: ToolbarAction) {
    switch (action) {
      case 'bold':
        insertMarkdown('**', '**')
        break
      case 'heading': {
        const textarea = textareaRef.current
        if (!textarea) return
        const start = textarea.selectionStart
        // Get the start of the current line
        const lineStart = content.lastIndexOf('\n', start - 1) + 1
        const line = content.substring(lineStart, content.indexOf('\n', lineStart) === -1 ? content.length : content.indexOf('\n', lineStart))
        if (line.startsWith('### ')) {
          // Remove heading
          const newText = content.substring(0, lineStart) + content.substring(lineStart + 4)
          setContent(newText)
          onSaveRef.current(newText)
        } else if (line.startsWith('## ')) {
          // Increase to ###
          const newText = content.substring(0, lineStart) + '#' + content.substring(lineStart)
          setContent(newText)
          onSaveRef.current(newText)
        } else if (line.startsWith('# ')) {
          // Demote to ##
          const newText = content.substring(0, lineStart) + '#' + content.substring(lineStart)
          setContent(newText)
          onSaveRef.current(newText)
        } else {
          // Add #
          insertMarkdown('# ', '', true)
        }
        break
      }
      case 'list':
        insertMarkdown('- ', '', true)
        break
      case 'quote':
        insertMarkdown('> ', '', true)
        break
      case 'link': {
        const textarea = textareaRef.current
        if (!textarea) return
        const selected = content.substring(textarea.selectionStart, textarea.selectionEnd)
        if (selected) {
          insertMarkdown('[', '](url)')
        } else {
          insertMarkdown('[链接文字](url)')
        }
        break
      }
      case 'code':
        insertMarkdown('`', '`')
        break
    }
  }

  // Desktop: split view with view mode toggle
  if (isDesktop) {
    const viewModes = [
      { mode: 'edit' as const, icon: Edit3, title: '编辑' },
      { mode: 'split' as const, icon: Columns2, title: '分栏' },
      { mode: 'preview' as const, icon: Eye, title: '预览' },
    ]

    return (
      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        <div className="flex items-center gap-1 bg-muted/30 px-2 py-2">
          {TOOLBAR_ITEMS.map(({ action, icon: Icon, title }) => (
            <button
              key={action}
              type="button"
              onClick={() => handleToolbar(action)}
              title={title}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/70 transition-colors"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <div className="ml-auto flex items-center gap-0.5">
            {viewModes.map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                title={title}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  viewMode === mode
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <span className="ml-2 text-[11px] text-muted-foreground/60">自动保存</span>
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(
              'flex-1 resize-none bg-background px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none min-w-0',
              viewMode === 'split' && 'border-r',
              viewMode === 'preview' && 'hidden',
            )}
            spellCheck={false}
          />
          <div className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 min-w-0',
            viewMode === 'edit' && 'hidden',
          )}>
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground/50">预览区域</p>
                </div>
              )}
          </div>
        </div>
      </div>
    )
  }

  // Mobile: tab toggle
  return (
    <div className="flex min-h-0 flex-1 flex-col min-w-0">
      <div className="flex items-center gap-1 bg-muted/30 px-2 py-2">
        {TOOLBAR_ITEMS.map(({ action, icon: Icon, title }) => (
          <button
            key={action}
            type="button"
            onClick={() => handleToolbar(action)}
            title={title}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/70 transition-colors"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowingPreview(false)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              !showingPreview ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
            title="编辑"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowingPreview(true)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              showingPreview ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
            title="预览"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
          {showingPreview ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 min-w-0">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-sm text-muted-foreground">预览</p>
              )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder={placeholder}
            className="flex-1 resize-none bg-background px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none min-w-0"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
})

export { MarkdownEditor }
