'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import ImageExtension from '@tiptap/extension-image'
import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Heading2, List, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import DOMPurify from 'dompurify'

interface RichEditorProps {
  content: string
  onSave: (html: string) => void
  placeholder?: string
  noteId?: string
}

export function RichEditor({ content, onSave, placeholder = '开始写笔记...', noteId }: RichEditorProps) {
  const savedContent = useRef(content)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const sanitize = (html: string) =>
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'img', 'span', 'div',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'sub', 'sup', 'input',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'style', 'src', 'alt',
        'width', 'height', 'type', 'checked', 'disabled',
      ],
    })

  const doSave = (html: string) => {
    const clean = sanitize(html)
    savedContent.current = clean
    try { Promise.resolve(onSaveRef.current(clean)).catch(() => {}) } catch {}
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !noteId) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('noteId', noteId)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const attachment = await res.json()

      if (file.type.startsWith('image/')) {
        editor?.chain().focus().setImage({ src: attachment.url, alt: file.name }).run()
      } else {
        editor?.chain().focus().setLink({ href: attachment.url }).insertContent(` ${file.name} `).run()
      }
    } catch (e) {
      console.error('Upload failed:', e)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageExtension,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] px-4 py-3 text-sm leading-relaxed',
      },
    },
    onUpdate: () => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (!editor) return
        const html = editor.getHTML()
        doSave(html)
      }, 500)
    },
  })

  useEffect(() => {
    const el = editor?.view?.dom
    if (!el) return
    const onBlur = () => {
      clearTimeout(saveTimer.current)
      if (!editor) return
      const html = editor.getHTML()
      if (html !== savedContent.current) {
        doSave(html)
      }
    }
    el.addEventListener('blur', onBlur)
    return () => el.removeEventListener('blur', onBlur)
  }, [editor])

  if (!editor) return null

  const ToolBtn = ({ onClick, active, children, title, disabled }: {
    onClick: () => void; active?: boolean; children: React.ReactNode; title?: string; disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
        active && 'bg-accent text-accent-foreground',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  const toggleHeading = () => {
    if (editor.isActive('heading', { level: 2 })) {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    } else if (editor.isActive('heading', { level: 3 })) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="粗体">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={toggleHeading} active={editor.isActive('heading')} title="标题">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={!noteId} title={noteId ? '上传图片或文件' : '请先保存笔记再上传'}>
          {uploading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </ToolBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          className="hidden"
          onChange={handleImageUpload}
        />
        <span className="ml-auto text-[10px] text-muted-foreground">{uploading ? '上传中...' : '自动保存'}</span>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
