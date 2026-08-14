'use client'

import { useState, useRef, useCallback } from 'react'
import { Database, Download, Upload, CheckCircle, AlertCircle, ChevronRight, Loader2, Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/page-header'
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
import { exportBackupData, importBackupData } from '@/lib/services/backup'
import { saveFileToDevice } from '@/lib/services/file-share'
import { isNativeCapacitor } from '@/lib/services/env'
import { cn } from '@/lib/utils'

type ThemeMode = 'system' | 'light' | 'dark'

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'system', label: '跟随系统', icon: Monitor },
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
]

function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem('lifeos-theme')
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export default function SettingsPage() {
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)
  const fileRef = useRef<HTMLInputElement>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const applyTheme = useCallback((t: ThemeMode) => {
    try {
      localStorage.setItem('lifeos-theme', t)
    } catch {
      /* storage unavailable, keep in-memory only */
    }
    const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    setTheme(t)
  }, [])

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const data = await exportBackupData()
      await saveFileToDevice({
        filename: `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`,
        content: JSON.stringify(data, null, 2),
        mime: 'application/json',
      })
      showMsg(
        'success',
        isNativeCapacitor() ? '备份已生成，请在分享面板中选择保存位置' : '备份已下载'
      )
    } catch (e) {
      console.error('Export failed:', e)
      showMsg('error', '备份失败')
    }
    setBackingUp(false)
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      try {
        const result = await importBackupData(data)
        showMsg('success', `成功恢复 ${result.imported} 条记录，请刷新页面`)
        setTimeout(() => window.location.reload(), 1500)
      } catch (e) {
        console.error('Failed to restore backup:', e)
        const msg = (e as Error).message
        if (msg.startsWith('无效的备份文件') || msg === '无效的 JSON 格式') {
          showMsg('error', msg)
        } else {
          showMsg('error', '恢复失败')
        }
      }
    } catch {
      showMsg('error', '无效的备份文件')
    }
    setRestoring(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader icon={<Database className="h-5 w-5" />} title="备份与恢复" />

      {message && (
        <div className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium ${
          message.type === 'success'
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {message.text}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* 数据：备份/恢复列表式菜单 */}
          <Card>
            <CardContent className="p-2">
              <h2 className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">数据</h2>
              <button
                onClick={handleBackup}
                disabled={backingUp}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">导出备份</span>
                  <span className="block text-xs text-muted-foreground">全部笔记、预算、习惯及打卡、体重 → JSON 文件</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </button>
              <button
                onClick={() => setRestoreOpen(true)}
                disabled={restoring}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">导入恢复</span>
                  <span className="block text-xs text-muted-foreground">清空现有数据并恢复备份文件内容</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </button>
            </CardContent>
          </Card>

          {/* 外观：主题切换（system/light/dark，localStorage 持久化，layout 内联脚本读取） */}
          <Card>
            <CardContent className="p-2">
              <h2 className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">外观</h2>
              <div className="flex gap-2 px-3 py-2">
                {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => applyTheme(key)}
                    aria-pressed={theme === key}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs transition-all',
                      theme === key
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="px-1 pb-4 text-center text-[11px] text-muted-foreground/60">LifeOS v1.0.0 · 数据本地存储</p>
        </div>
      </ScrollArea>

      {/* Hidden file input for restore */}
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={handleRestore}
        className="hidden"
      />

      {/* Restore confirmation dialog */}
      <AlertDialogRoot open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定恢复备份？</AlertDialogTitle>
            <AlertDialogDescription>
              恢复将清空现有所有数据（笔记、预算、习惯、体重），并替换为备份文件中的内容。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRestoreOpen(false)
                setTimeout(() => fileRef.current?.click(), 100)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              选择备份文件
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </div>
  )
}
