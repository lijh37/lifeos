'use client'

import { useEffect, useState, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ErrorBoundary } from '@/components/error-boundary'
import { CheckCircle, Circle, Plus, Trash2, Trophy, Flame, Pencil, Check, X } from 'lucide-react'
import { SkeletonHabits } from '@/components/skeleton-card'
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

const HabitRow = memo(function HabitRow({
  habit,
  done,
  streak,
  bestStreak,
  weekCount,
  monthCount,
  totalCompletions,
  today,
  onToggle,
  onDelete,
  onEdit,
  isEditing,
  editValue,
  onEditValueChange,
  onEditConfirm,
  onEditCancel,
}: {
  habit: Habit
  done: boolean
  streak: number
  bestStreak: number
  weekCount: number
  monthCount: number
  totalCompletions: number
  today: string
  onToggle: (habitId: string, date: string) => void
  onDelete: (id: string) => void
  onEdit: (habit: Habit) => void
  isEditing: boolean
  editValue: string
  onEditValueChange: (value: string) => void
  onEditConfirm: () => void
  onEditCancel: () => void
}) {
  return (
    <Card className="card-hover">
      <CardContent className="flex items-center gap-3 p-3">
        <button onClick={() => onToggle(habit.id, today)} className="shrink-0">
          {done ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={e => onEditValueChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onEditConfirm()
                  if (e.key === 'Escape') onEditCancel()
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={onEditConfirm}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                  {habit.name}
                </p>
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-orange-500" title={`当前连续 ${streak} 天`}>
                    <Flame className="h-3 w-3" />
                    {streak}天
                  </span>
                )}
                {bestStreak > 0 && bestStreak !== streak && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title={`最佳连续 ${bestStreak} 天`}>
                    <Trophy className="h-3 w-3" />
                    {bestStreak}天
                  </span>
                )}
              </div>
              {habit.description && (
                <p className="text-xs text-muted-foreground">{habit.description}</p>
              )}
              <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>本周 {weekCount} 次</span>
                <span>本月 {monthCount} 次</span>
                <span>累计 {totalCompletions} 次</span>
              </div>
            </>
          )}
        </div>
        {!isEditing && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onEdit(habit)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(habit.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  )
})
HabitRow.displayName = 'HabitRow'

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

// Export for testing
export { HabitRow }

export default function HabitsPage() {
  return (
    <ErrorBoundary>
      <HabitsPageInner />
    </ErrorBoundary>
  )
}
