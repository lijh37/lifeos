'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ErrorBoundary } from '@/components/error-boundary'
import { Plus, Trophy } from 'lucide-react'
import { SkeletonHabits } from '@/components/skeleton-card'
import { HabitRow } from '@/components/habit-row'
import type { Habit } from '@/lib/types'
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

function HabitsPageInner() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayMap, setTodayMap] = useState<Record<string, boolean>>({})
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [bestStreaks, setBestStreaks] = useState<Record<string, number>>({})
  const [perHabitTotals, setPerHabitTotals] = useState<Record<string, number>>({})
  const [perHabitWeek, setPerHabitWeek] = useState<Record<string, number>>({})
  const [perHabitMonth, setPerHabitMonth] = useState<Record<string, number>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/habits')
      .then((res) => res.json())
      .then((data) => {
        setHabits(data.habits)
        setTodayMap(data.todayCompletions)
        setStreaks(data.streaks || {})
        setBestStreaks(data.bestStreaks || {})
        setPerHabitTotals(data.perHabitTotals || {})
        setPerHabitWeek(data.perHabitWeek || {})
        setPerHabitMonth(data.perHabitMonth || {})
      })
      .catch((e) => console.error('Failed to fetch habits:', e))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(habitId: string, date: string) {
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'toggle', habitId, date }),
    })
    const data = await res.json()
    setTodayMap((prev) => ({ ...prev, [habitId]: data.completed }))
  }

  function handleDelete(id: string) {
    setDeleteTarget(id)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await fetch(`/api/habits?id=${deleteTarget}`, { method: 'DELETE' })
      setHabits((prev) => prev.filter((h) => h.id !== deleteTarget))
    } catch (e) {
      console.error('Failed to delete habit:', e)
    }
    setDeleteTarget(null)
  }

  function handleEdit(habit: Habit) {
    setEditingId(habit.id)
    setEditValue(habit.name)
  }

  async function handleEditConfirm() {
    if (!editingId || !editValue.trim()) return
    try {
      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editValue.trim(), description: '' }),
      })
      if (res.ok) {
        setHabits((prev) =>
          prev.map((h) => (h.id === editingId ? { ...h, name: editValue.trim() } : h))
        )
      }
    } catch (e) {
      console.error('Failed to edit habit:', e)
    }
    setEditingId(null)
    setEditValue('')
  }

  function handleEditCancel() {
    setEditingId(null)
    setEditValue('')
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    setHabits((prev) => [data.habit, ...prev])
    setNewName('')
    setShowInput(false)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">习惯</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowInput(!showInput)} className="gap-2">
            <Plus className="h-4 w-4" />
            新建
          </Button>
        </div>

        {showInput && (
          <div className="mt-2 flex gap-2 animate-slide-up">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="习惯名称…"
              className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-ring"
            />
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>添加</Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <SkeletonHabits count={4} />
        ) : habits.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-10 w-10 text-muted-foreground/50" />
            <p>还没有习惯，点上方「新建」按钮添加</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="animate-stagger space-y-2">
              {habits.map((habit) => {
                const done = todayMap[habit.id] ?? false
                return (
                  <HabitRow key={habit.id} habit={habit} done={done} streak={streaks[habit.id] ?? 0} bestStreak={bestStreaks[habit.id] ?? 0} weekCount={perHabitWeek[habit.id] ?? 0} monthCount={perHabitMonth[habit.id] ?? 0} totalCompletions={perHabitTotals[habit.id] ?? 0} today={today} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} isEditing={editingId === habit.id} editValue={editValue} onEditValueChange={setEditValue} onEditConfirm={handleEditConfirm} onEditCancel={handleEditCancel} />
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      <AlertDialogRoot open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除该习惯？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可撤销，相关的打卡记录也会被删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </div>
  )
}

export default function HabitsPage() {
  return (
    <ErrorBoundary>
      <HabitsPageInner />
    </ErrorBoundary>
  )
}
