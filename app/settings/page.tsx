'use client'

import { useState, useRef } from 'react'
import { Database, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/backup')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showMsg('success', '备份已下载')
    } catch {
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
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        showMsg('success', `成功恢复 ${result.imported} 条记录，请刷新页面`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        showMsg('error', result.error || '恢复失败')
      }
    } catch {
      showMsg('error', '无效的备份文件')
    }
    setRestoring(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">备份与恢复</h1>
        </div>
      </div>

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
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-1 text-sm font-medium">一键备份与恢复</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                备份将导出全部笔记、预算、习惯及打卡记录为 JSON 文件。恢复将清空现有数据并导入备份文件。
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleBackup}
                  disabled={backingUp}
                >
                  {backingUp ? (
                    <div className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="mr-1.5 h-4 w-4" />
                  )}
                  导出备份
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setRestoreOpen(true)}
                  disabled={restoring}
                >
                  {restoring ? (
                    <div className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  导入恢复
                </Button>
              </div>
            </CardContent>
          </Card>


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
              恢复将清空现有所有数据（笔记、预算、习惯），并替换为备份文件中的内容。此操作不可撤销。
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
