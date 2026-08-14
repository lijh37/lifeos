'use client'

import { memo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle,
  Circle,
  Trash2,
  Trophy,
  Flame,
  Pencil,
  Check,
  X,
  ChevronDown,
} from 'lucide-react'
import type { Habit } from '@/lib/types'

export interface RecentDayEntry {
  date: string
  completed: boolean
  isBackfilled: boolean
}

export interface HabitRowProps {
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
  editValue?: string
  onEditValueChange?: (value: string) => void
  onEditConfirm: () => void
  onEditCancel: () => void
  /** 最近 3 天打卡记录（新的在前，index 0 = 今天），用于补记面板；缺省时不渲染补记 */
  recentDays?: RecentDayEntry[]
  /** 完成率（0-100），用于完成率进度条 */
  rate?: number
}

const DAY_LABELS = ['今天', '昨天', '前天']

function formatMonthDay(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (Number.isNaN(month) || Number.isNaN(day)) return dateStr
  return `${month}/${day}`
}

export const HabitRow = memo(function HabitRow({
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
  recentDays,
  rate,
}: HabitRowProps) {
  const [backfillOpen, setBackfillOpen] = useState(false)
  const canBackfill = Array.isArray(recentDays) && recentDays.length > 0

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggle(habit.id, today)}
            className="shrink-0 p-2"
            aria-label={done ? '取消今日打卡' : '今日打卡'}
          >
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
                  value={editValue ?? ''}
                  onChange={e => onEditValueChange?.(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onEditConfirm()
                    if (e.key === 'Escape') onEditCancel()
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="text-green-600" onClick={onEditConfirm}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={onEditCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className={`min-w-0 truncate text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                    {habit.name}
                  </p>
                  {streak > 0 && (
                    <button
                      type="button"
                      onClick={() => canBackfill && setBackfillOpen(o => !o)}
                      aria-expanded={backfillOpen}
                      title={`当前连续 ${streak} 天`}
                      className={`flex items-center gap-0.5 text-[11px] transition-colors ${
                        backfillOpen ? 'text-orange-400' : 'text-orange-400/60'
                      } ${canBackfill ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'}`}
                    >
                      <Flame className="h-2.5 w-2.5" />
                      {streak}天
                      {canBackfill && (
                        <ChevronDown
                          className={`h-2.5 w-2.5 transition-transform duration-200 ${
                            backfillOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>
                  )}
                  {streak <= 0 && canBackfill && (
                    <button
                      type="button"
                      onClick={() => setBackfillOpen(o => !o)}
                      aria-expanded={backfillOpen}
                      title="补记最近打卡"
                      className={`cursor-pointer text-xs transition-colors ${
                        backfillOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      补记
                    </button>
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
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>本周 {weekCount} 次</span>
                  <span>本月 {monthCount} 次</span>
                  <span>累计 {totalCompletions} 次</span>
                </div>
                {typeof rate === 'number' && Number.isFinite(rate) && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      完成率 {Math.round(rate)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {!isEditing && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(habit)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive ml-1"
            onClick={() => onDelete(habit.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {canBackfill && backfillOpen && (
          <div className="mt-2 animate-[fadeIn_0.2s_ease-out] border-t pt-2">
            <div className="mb-1 px-1 text-[10px] text-muted-foreground">补记</div>
            <div className="space-y-0.5">
              {recentDays.map((day, index) => {
                const label = DAY_LABELS[index] ?? formatMonthDay(day.date)
                const backfilled = day.isBackfilled && index !== 0
                return (
                  <div
                    key={day.date}
                    className="flex items-center justify-between rounded-md px-1 py-1 transition-colors hover:bg-muted/40"
                  >
                    <span className="text-xs text-muted-foreground">
                      {label} {formatMonthDay(day.date)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(habit.id, day.date)}
                      title={backfilled ? '补记' : undefined}
                      aria-label={`${label} ${day.completed ? '已打卡' : '未打卡'}`}
                      aria-pressed={day.completed}
                      className="shrink-0"
                    >
                      {day.completed ? (
                        <CheckCircle
                          className={`h-5 w-5 ${backfilled ? 'text-green-500/50' : 'text-green-500'}`}
                        />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
HabitRow.displayName = 'HabitRow'
