'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Upload, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const BACKUP_KEY = 'lifeos_auto_backup'
const BACKUP_INTERVAL = 5 * 60 * 1000

export function useAutoBackup() {
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(BACKUP_KEY)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setLastBackup(data.timestamp || null)
      } catch {}
    }
  }, [])

  const performBackup = useCallback(async () => {
    try {
      const [notesRes, habitsRes, chatRes] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/habits'),
        fetch('/api/chat/history'),
      ])

      const notes = await notesRes.json()
      const habits = await habitsRes.json()
      const chat = await chatRes.json()

      const backup = {
        timestamp: new Date().toISOString(),
        notes: notes.notes || notes,
        habits: habits.habits || [],
        chatMessages: chat.messages || [],
      }

      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
      setLastBackup(backup.timestamp)

      localStorage.setItem('lifeos_last_backup_time', backup.timestamp)
    } catch (e) {
      console.error('Auto backup failed:', e)
    }
  }, [])

  useEffect(() => {
    performBackup()
    const interval = setInterval(performBackup, BACKUP_INTERVAL)
    return () => clearInterval(interval)
  }, [performBackup])

  return { lastBackup, performBackup }
}

export function AutoBackup() {
  useAutoBackup()
  return null
}

export function BackupManager() {
  const { lastBackup, performBackup } = useAutoBackup()
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleManualBackup = async () => {
    setBackingUp(true)
    await performBackup()
    setBackingUp(false)
    setStatus('备份完成')
    setTimeout(() => setStatus(null), 2000)
  }

  const handleRestore = async () => {
    const stored = localStorage.getItem(BACKUP_KEY)
    if (!stored) {
      setStatus('没有找到备份数据')
      setTimeout(() => setStatus(null), 2000)
      return
    }

    setRestoring(true)
    try {
      const backup = JSON.parse(stored)

      if (backup.notes && Array.isArray(backup.notes)) {
        await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: backup.notes }),
        })
      }

      localStorage.setItem('lifeos_restore_time', new Date().toISOString())
      setStatus('恢复成功，请刷新页面')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      setStatus('恢复失败')
      console.error('Restore failed:', e)
    } finally {
      setRestoring(false)
    }
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">自动备份</h2>
                <p className="text-xs text-muted-foreground">
                  {lastBackup
                    ? `上次备份: ${new Date(lastBackup).toLocaleString('zh-CN')}`
                    : '尚未备份'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleManualBackup} disabled={backingUp}>
                {backingUp ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                备份
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRestoreOpen(true)} disabled={restoring}>
                {restoring ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
                恢复
              </Button>
            </div>
          </div>
          {status && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              {status}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialogRoot open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复备份</AlertDialogTitle>
            <AlertDialogDescription>
              恢复备份将覆盖当前数据，确定继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </>
  )
}
