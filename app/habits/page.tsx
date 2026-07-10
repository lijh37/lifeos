'use client'

import { useEffect, useState, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ErrorBoundary } from '@/components/error-boundary'
import { CheckCircle, Circle, Plus, Trash2, Trophy, Flame, CalendarCheck, Target, TrendingUp } from 'lucide-react'
import { SkeletonHabits } from '@/components/skeleton-card'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Habit } from '@/lib/types'

const HabitRow = memo(function HabitRow({
  habit,
  done,
  streak,
  today,
  onToggle,
  onDelete,
}: {
  habit: Habit
  done: boolean
  streak: number
  today: string
  onToggle: (habitId: string, date: string) => void
  onDelete: (id: string) => void
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
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
              {habit.name}
            </p>
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                <Flame className="h-3 w-3" />
                {streak}天
              </span>
            )}
          </div>
          {habit.description && (
            <p className="text-xs text-muted-foreground">{habit.description}</p>
          )}
        </div>
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

interface HabitStats {
  monthlyRate: number
  monthCompletions: number
  totalCompletions: number
  trend7d: { date: string; count: number }[]
}

function HabitsPageInner() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayMap, setTodayMap] = useState<Record<string, boolean>>({})
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [stats, setStats] = useState<HabitStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)

  useEffect(() => {
    fetch('/api/habits')
      .then((res) => res.json())
      .then((data) => {
        setHabits(data.habits)
        setTodayMap(data.todayCompletions)
        setStreaks(data.streaks || {})
        setStats(data.stats || null)
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

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/habits?id=${id}`, { method: 'DELETE' })
      setHabits((prev) => prev.filter((h) => h.id !== id))
    } catch (e) {
      console.error('Failed to delete habit:', e)
    }
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
  const completedCount = habits.filter((h) => todayMap[h.id]).length
  const allDone = habits.length > 0 && completedCount === habits.length

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
            <p>还没有习惯，点击新建添加</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {stats && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-card p-3 text-center card-hover">
                  <Flame className="mx-auto mb-1 h-4 w-4 text-orange-500" />
                  <p className="text-lg font-bold">{completedCount}/{habits.length}</p>
                  <p className="text-[10px] text-muted-foreground">今日</p>
                </div>
                <div className="rounded-lg bg-card p-3 text-center">
                  <CalendarCheck className="mx-auto mb-1 h-4 w-4 text-green-500" />
                  <p className="text-lg font-bold">{stats.monthlyRate}%</p>
                  <p className="text-[10px] text-muted-foreground">月完成率</p>
                </div>
                <div className="rounded-lg bg-card p-3 text-center">
                  <Target className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                  <p className="text-lg font-bold">{stats.monthCompletions}</p>
                  <p className="text-[10px] text-muted-foreground">本月打卡</p>
                </div>
                <div className="rounded-lg bg-card p-3 text-center">
                  <Trophy className="mx-auto mb-1 h-4 w-4 text-purple-500" />
                  <p className="text-lg font-bold">{stats.totalCompletions}</p>
                  <p className="text-[10px] text-muted-foreground">累计</p>
                </div>
              </div>
            )}

            {stats && (
              <div className="rounded-lg bg-card p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">近7天趋势</span>
                </div>
                <div className="flex items-end gap-1.5" style={{ height: 48 }}>
                  {stats.trend7d.map((d) => {
                    const maxCount = Math.max(...stats.trend7d.map(x => x.count), 1)
                    const height = (d.count / maxCount) * 100
                    return (
                      <div key={d.date} className="flex flex-1 flex-col items-center gap-0.5">
                        <div
                          className="w-full rounded-t bg-orange-400"
                          style={{ height: `${Math.max(height, 8)}%` }}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {format(new Date(d.date), 'E', { locale: zhCN }).charAt(0)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="animate-stagger space-y-2">
              {habits.map((habit) => {
                const done = todayMap[habit.id] ?? false
                return (
                  <HabitRow key={habit.id} habit={habit} done={done} streak={streaks[habit.id] ?? 0} today={today} onToggle={handleToggle} onDelete={handleDelete} />
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export { HabitRow }

export default function HabitsPage() {
  return (
    <ErrorBoundary>
      <HabitsPageInner />
    </ErrorBoundary>
  )
}
