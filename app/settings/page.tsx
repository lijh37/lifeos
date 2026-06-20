'use client'

import { useEffect, useState, useRef } from 'react'
import { Settings, Download, Upload, Trash2, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function SettingsPage() {
  const [stats, setStats] = useState<{
    notes: number
    notesDetail: { note: number; task: number; event: number }
    expenses: number
    habits: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchStats = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStats() }, [])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleClear = async (type: string, label: string) => {
    if (!confirm(`确定清除所有${label}？此操作不可恢复。`)) return
    const res = await fetch(`/api/settings?type=${type}`, { method: 'DELETE' })
    if (res.ok) {
      showMsg('success', `${label}已清除`)
      fetchStats()
    } else {
      showMsg('error', '清除失败')
    }
  }

  const handleExport = () => {
    window.open('/api/export?format=json&type=all', '_blank')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        showMsg('success', `成功导入 ${result.imported} 条记录`)
        fetchStats()
      } else {
        showMsg('error', result.error || '导入失败')
      }
    } catch {
      showMsg('error', '无效的备份文件')
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const summary = stats ? [
    { label: '笔记', count: stats.notesDetail.note, type: 'notes', color: 'bg-blue-500' },
    { label: '任务', count: stats.notesDetail.task, type: 'notes', color: 'bg-orange-500' },
    { label: '事件', count: stats.notesDetail.event, type: 'notes', color: 'bg-purple-500' },
    { label: '收支', count: stats.expenses, type: 'expenses', color: 'bg-green-500' },
    { label: '习惯', count: stats.habits, type: 'habits', color: 'bg-rose-500' },
  ] : []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">设置</h1>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-2 text-center text-xs font-medium ${
          message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">数据概览</h2>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                      <span className="flex-1 text-sm">{item.label}</span>
                      <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                      {item.count > 0 && (
                        <button
                          onClick={() => handleClear(item.type, item.label)}
                          className="text-xs text-destructive hover:underline"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  ))}
                  {stats && (stats.notes + stats.expenses + stats.habits) > 0 && (
                    <div className="flex items-center gap-3 pt-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-auto"
                        onClick={() => handleClear('all', '全部数据')}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        清除全部
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">备份与恢复</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleExport}>
                  <Download className="mr-1 h-4 w-4" />
                  导出备份
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={importing}>
                  {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                  导入恢复
                </Button>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                导出的 JSON 文件包含所有笔记、任务、事件和收支记录
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">关于</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">版本</span>
                  <span>0.2.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">框架</span>
                  <span>Next.js 16</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI 引擎</span>
                  <span>DeepSeek</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">数据库</span>
                  <span>SQLite / Turso</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
