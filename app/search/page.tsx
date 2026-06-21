'use client'

import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Search, ArrowDown, ArrowUp, Trophy, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Note, Expense, Habit } from '@/lib/types'
import { typeLabels, typeColors, categoryLabels } from '@/lib/constants'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      setNotes([]); setExpenses([]); setHabits([]); setSearched(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (!controller.signal.aborted) {
            setNotes(data.notes)
            setExpenses(data.expenses)
            setHabits(data.habits)
            setSearched(true)
          }
        })
        .catch(() => {})
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 300)

    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  const total = notes.length + expenses.length + habits.length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索笔记、收支、习惯..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清除
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : searched && total === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
            <Search className="mb-2 h-8 w-8" />
            没有找到「{query}」相关的结果
          </div>
        ) : searched ? (
          <div className="space-y-4 p-4 animate-fade-in">
            {notes.length > 0 && (
              <Section title={`笔记 (${notes.length})`}>
                {notes.map(n => (
                  <Card key={n.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Badge className={typeColors[n.type]}>{typeLabels[n.type]}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{n.title || n.content.slice(0, 60)}</div>
                        {n.title && <p className="truncate text-xs text-muted-foreground">{n.content}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {n.tags.map(t => <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>)}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(n.createdAt), 'MM/dd', { locale: zhCN })}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </Section>
            )}

            {expenses.length > 0 && (
              <Section title={`收支 (${expenses.length})`}>
                {expenses.map(e => (
                  <Card key={e.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        e.type === 'expense'
                          ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                          : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                      }`}>
                        {e.type === 'expense' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{e.description || e.category}</span>
                          <Badge variant="outline" className="text-[10px]">{categoryLabels[e.category] || e.category}</Badge>
                        </div>
                      </div>
                      <span className={`shrink-0 text-sm font-bold ${e.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                        {e.type === 'expense' ? '-' : '+'}¥{e.amount.toFixed(1)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </Section>
            )}

            {habits.length > 0 && (
              <Section title={`习惯 (${habits.length})`}>
                {habits.map(h => (
                  <Card key={h.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Trophy className="h-5 w-5 text-orange-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{h.name}</div>
                        {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{h.frequency === 'daily' ? '每日' : '每周'}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </Section>
            )}
          </div>
        ) : null}
      </ScrollArea>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
