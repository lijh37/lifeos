'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Note } from '@/lib/types'
import { typeLabels, typeDotColors } from '@/lib/constants'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])
  const calStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart])
  const calEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd])
  const days = useMemo(() => eachDayOfInterval({ start: calStart, end: calEnd }), [calStart, calEnd])

  useEffect(() => {
    setLoading(true)
    const start = format(calStart, 'yyyy-MM-dd')
    const end = format(calEnd, 'yyyy-MM-dd')
    fetch(`/api/notes?startDate=${start}&endDate=${end}`)
      .then(res => res.json())
      .then(data => setNotes(data.notes))
      .finally(() => setLoading(false))
  }, [calStart, calEnd])

  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {}
    for (const note of notes) {
      if (note.dueDate) {
        const key = note.dueDate.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(note)
      }
    }
    return map
  }, [notes])

  const selectedNotes = selectedDate ? notesByDate[selectedDate] || [] : []

  const prevMonth = useCallback(() => setCurrentDate(d => subMonths(d, 1)), [])
  const nextMonth = useCallback(() => setCurrentDate(d => addMonths(d, 1)), [])
  const goToday = useCallback(() => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }, [])

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">日历</h1>
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>今天</Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold">
          {format(currentDate, 'yyyy年M月', { locale: zhCN })}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-4 pb-2">
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayNotes = notesByDate[dateStr] || []
            const inMonth = isSameMonth(day, currentDate)
            const isTodayDay = isToday(day)
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="relative flex flex-col items-center py-1"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm
                  ${isTodayDay ? 'bg-primary text-primary-foreground font-bold' : ''}
                  ${isSelected && !isTodayDay ? 'ring-2 ring-primary' : ''}
                  ${!inMonth ? 'text-muted-foreground/30' : ''}
                  ${!isTodayDay && inMonth ? 'hover:bg-accent' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                {dayNotes.length > 0 && (
                  <div className="mt-0.5 flex gap-0.5">
                    {dayNotes.slice(0, 3).map(n => (
                      <span key={n.id} className={`h-1.5 w-1.5 rounded-full ${typeDotColors[n.type] || 'bg-gray-400'}`} />
                    ))}
                    {dayNotes.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayNotes.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="flex-1 border-t">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {format(new Date(selectedDate + 'T12:00:00'), 'M月d日 EEEE', { locale: zhCN })}
            </h3>
          </div>
          <ScrollArea className="h-full">
            {selectedNotes.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                该日没有条目
              </div>
            ) : (
              <div className="space-y-1 px-4 pb-4">
                {selectedNotes.map(n => (
                  <Card key={n.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${typeDotColors[n.type] || 'bg-gray-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{n.title || n.content.slice(0, 40)}</span>
                          <Badge variant="outline" className="text-[10px]">{typeLabels[n.type] || n.type}</Badge>
                        </div>
                        {n.title && n.content !== n.title && (
                          <p className="truncate text-xs text-muted-foreground">{n.content}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
