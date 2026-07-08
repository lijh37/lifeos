'use client'

import { useEffect, useState, useRef } from 'react'
import { Settings, Download, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BackupManager } from '@/components/auto-backup'
import {
  AlertDialogRoot,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export default function SettingsPage() {
  const [stats, setStats] = useState<{
    notes: number
    notesDetail: { note: number }
    budgets: number
    habits: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [clearTarget, setClearTarget] = useState<{ type: string; label: string } | null>(null)
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
    { label: '预算', count: stats.budgets, type: 'budgets', color: 'bg-emerald-500' },
    { label: '习惯', count: stats.habits, type: 'habits', color: 'bg-rose-500' },
  ] : []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
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
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
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
                          onClick={() => setClearTarget({ type: item.type, label: item.label })}
                          className="text-xs text-destructive hover:underline"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  ))}
                  {stats && (stats.notes + stats.budgets + stats.habits) > 0 && (
                    <div className="flex items-center gap-3 border-t pt-3 mt-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-auto"
                        onClick={() => setClearTarget({ type: 'all', label: '全部数据' })}
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

          <BackupManager />

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">手动导出/导入</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleExport}>
                  <Download className="mr-1.5 h-4 w-4" />
                  导出备份
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={importing}>
                  {importing ? <div className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Upload className="mr-1.5 h-4 w-4" />}
                  导入恢复
                </Button>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                导出的 JSON 文件包含所有笔记、预算和习惯记录
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
                  <span>Turso（云端）</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <AlertDialogRoot
        open={clearTarget !== null}
        onOpenChange={(open) => { if (!open) setClearTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定清除所有{clearTarget?.label}？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可恢复，数据将被永久删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (clearTarget) {
                  handleClear(clearTarget.type, clearTarget.label)
                  setClearTarget(null)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </div>
  )
}
