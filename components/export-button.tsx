'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileJson } from 'lucide-react'

export function ExportButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function download(format: 'md' | 'json') {
    const params = new URLSearchParams()
    params.set('type', 'notes')
    params.set('format', format)
    window.open(`/api/export?${params}`, '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        导出
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border bg-popover p-1 shadow-md">
          <button
            onClick={() => download('md')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            Markdown
          </button>
          <button
            onClick={() => download('json')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <FileJson className="h-4 w-4" />
            JSON
          </button>
        </div>
      )}
    </div>
  )
}
