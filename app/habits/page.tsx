'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, Circle, Plus, Trash2, Trophy } from 'lucide-react'
import { SkeletonCard } from '@/components/skeleton-card'
import type { Habit } from '@/lib/types'

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayMap, setTodayMap] = useState<Record<string, boolean>>({})
  const [streaks, setStreaks] = useState<Record<string, number>>({})
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
      <div className="border-b p-4">
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
          <div className="mt-3 flex gap-2">
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

        {habits.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">今日打卡</span>
            <span className={allDone ? 'font-semibold text-green-500' : 'font-semibold'}>
              {completedCount}/{habits.length}
            </span>
            {allDone && <span className="text-green-500">🎉</span>}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4">
            <SkeletonCard count={4} />
          </div>
        ) : habits.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-8 w-8" />
            <p>还没有习惯，去 AI 对话或点新建添加</p>
          </div>
        ) : (
          <div className="space-y-1 p-4 animate-stagger">
            {habits.map((habit) => {
              const done = todayMap[habit.id] ?? false
              return (
                <Card key={habit.id} className="card-hover">
                  <CardContent className="flex items-center gap-3 p-3">
                    <button onClick={() => handleToggle(habit.id, today)} className="shrink-0">
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
                        {streaks[habit.id] > 0 && (
                          <span className="text-xs text-orange-500">
                            🔥 {streaks[habit.id]}天
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
                      onClick={() => handleDelete(habit.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
