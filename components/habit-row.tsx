'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Circle, Trash2, Trophy, Flame, Pencil, Check, X } from 'lucide-react'
import type { Habit } from '@/lib/types'

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
}: HabitRowProps) {
  return (
    <Card>
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
                value={editValue ?? ''}
                onChange={e => onEditValueChange?.(e.target.value)}
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
