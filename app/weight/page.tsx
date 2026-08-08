'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ErrorBoundary } from '@/components/error-boundary'
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
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Loader2,
  CalendarDays,
  Activity,
} from 'lucide-react'
import { WEIGHT_PERSONS, type WeightLog, type WeightPersonKey } from '@/lib/types'
import { fetchWeightData, saveWeightLog, deleteWeightLog } from '@/lib/services/weight'
import { WeightChart, WEIGHT_RANGES, type WeightRangeKey } from '@/components/weight-chart'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/** 今日日期（本地时区，YYYY-MM-DD） */
function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** 体重数值显示：最多保留 1 位小数，去掉多余的 .0 */
function fmtWeight(w: number): string {
  const v = Math.round(w * 10) / 10
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** 记录日期显示：当年不带年份，跨年带年份 */
function dateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  const sameYear = dateStr.slice(0, 4) === format(new Date(), 'yyyy')
  return format(d, sameYear ? 'M月d日 EEE' : 'yyyy年M月d日 EEE', { locale: zhCN })
}

/** 涨跌徽标：红涨绿跌，持平显示灰色横杠 */
function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        0
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        up ? 'text-red-500' : 'text-green-500'
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}
      {fmtWeight(Math.abs(delta))}
    </span>
  )
}

/** 统计小卡 */
function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl leading-none font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1.5 truncate text-[11px] text-muted-foreground/80">{sub}</div>}
    </div>
  )
}

function WeightPageInner() {
  const [data, setData] = useState<{ me: WeightLog[]; her: WeightLog[] }>({ me: [], her: [] })
  const [person, setPerson] = useState<WeightPersonKey>('me')
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<WeightRangeKey>('3m')
  const [date, setDate] = useState(todayStr)
  const [weightInput, setWeightInput] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WeightLog | null>(null)

  const fetchWeight = useCallback(async (): Promise<{ me: WeightLog[]; her: WeightLog[] }> => {
    return fetchWeightData()
  }, [])

  useEffect(() => {
    fetchWeight()
      .then((body) => setData({ me: body.me ?? [], her: body.her ?? [] }))
      .catch((e) => {
        console.error('Failed to fetch weight data:', e)
        toast.error('加载体重数据失败，请刷新重试')
      })
      .finally(() => setLoading(false))
  }, [fetchWeight])

  /** 当前人的记录（按日期升序） */
  const currentLogs = useMemo(() => {
    return [...(data[person] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  }, [data, person])

  const stats = useMemo(() => {
    if (currentLogs.length === 0) return null
    const first = currentLogs[0]
    const latest = currentLogs[currentLogs.length - 1]
    const prev = currentLogs.length > 1 ? currentLogs[currentLogs.length - 2] : null
    const weights = currentLogs.map((l) => l.weight)
    return {
      first,
      latest,
      count: currentLogs.length,
      deltaLast: prev ? latest.weight - prev.weight : null,
      deltaTotal: currentLogs.length > 1 ? latest.weight - first.weight : null,
      max: Math.max(...weights),
      min: Math.min(...weights),
    }
  }, [currentLogs])

  const descLogs = useMemo(() => [...currentLogs].reverse(), [currentLogs])
  const personLabel = WEIGHT_PERSONS.find((p) => p.key === person)?.label ?? '我'

  const handleSubmit = useCallback(async () => {
    const weight = parseFloat(weightInput)
    if (!weightInput.trim() || !Number.isFinite(weight) || weight <= 0 || weight > 500) {
      toast.error('请输入有效的体重（1–500 kg）')
      return
    }
    if (!date) {
      toast.error('请选择日期')
      return
    }
    setSaving(true)
    try {
      await saveWeightLog({ person, date, weight, note: note.trim() || undefined })
      const fresh = await fetchWeight().catch(() => null)
      if (fresh) setData({ me: fresh.me ?? [], her: fresh.her ?? [] })
      setWeightInput('')
      setNote('')
      toast.success('已保存')
    } catch (e) {
      console.error('Failed to save weight:', e)
      const msg = (e as Error).message
      if (msg === 'invalid weight') toast.error('体重数值不合法')
      else toast.error('保存失败，请检查网络')
    } finally {
      setSaving(false)
    }
  }, [person, date, weightInput, note, fetchWeight])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteWeightLog(deleteTarget.id)
      setData((prev) => ({
        ...prev,
        [person]: prev[person].filter((l) => l.id !== deleteTarget.id),
      }))
      toast.success('已删除')
    } catch (e) {
      console.error('Failed to delete weight log:', e)
      toast.error('删除失败，请重试')
    }
    setDeleteTarget(null)
  }, [deleteTarget, person])

  const today = todayStr()

  return (
    <div className="flex h-full flex-col">
      {/* 头部 + 「我 / 她」切换 */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">体重</h1>
          </div>
          <div className="flex rounded-lg bg-muted p-0.5" role="tablist" aria-label="记录人">
            {WEIGHT_PERSONS.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={person === p.key}
                onClick={() => setPerson(p.key)}
                className={cn(
                  'rounded-md px-4 py-1 text-sm transition-all',
                  person === p.key
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[80px] rounded-xl skeleton-pulse" />
              ))}
            </div>
            <div className="rounded-xl p-4 ring-1 ring-foreground/10">
              <div className="h-4 w-16 rounded skeleton-pulse" />
              <div className="mt-3 h-[190px] rounded skeleton-pulse" />
            </div>
            <div className="space-y-3 rounded-xl p-4 ring-1 ring-foreground/10">
              <div className="h-4 w-16 rounded skeleton-pulse" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-8 rounded-md skeleton-pulse" />
                <div className="h-8 rounded-md skeleton-pulse" />
              </div>
              <div className="h-8 rounded-md skeleton-pulse" />
              <div className="h-8 rounded-md skeleton-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {stats ? (
              <>
                {/* 关键统计 */}
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="最新体重"
                    icon={<Scale className="h-3.5 w-3.5" />}
                    value={
                      <>
                        {fmtWeight(stats.latest.weight)}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">kg</span>
                      </>
                    }
                    sub={dateLabel(stats.latest.date)}
                  />
                  <StatCard
                    label="较上次变化"
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    value={<DeltaBadge delta={stats.deltaLast} />}
                    sub={stats.deltaLast === null ? '暂无上一条记录' : '与上一次记录相比'}
                  />
                  <StatCard
                    label="总变化"
                    icon={<TrendingDown className="h-3.5 w-3.5" />}
                    value={<DeltaBadge delta={stats.deltaTotal} />}
                    sub={stats.deltaTotal === null ? '暂无历史对比' : `从 ${dateLabel(stats.first.date)} 至今`}
                  />
                  <StatCard
                    label="最高 / 最低"
                    icon={<Activity className="h-3.5 w-3.5" />}
                    value={
                      <span className="text-lg">
                        {fmtWeight(stats.max)}
                        <span className="mx-0.5 font-normal text-muted-foreground">/</span>
                        {fmtWeight(stats.min)}
                      </span>
                    }
                    sub={`累计 ${stats.count} 条记录`}
                  />
                </div>

                {/* 趋势图 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-medium">趋势</h2>
                      </div>
                      <div className="flex rounded-lg bg-muted p-0.5" role="tablist" aria-label="时间范围">
                        {WEIGHT_RANGES.map((r) => (
                          <button
                            key={r.key}
                            role="tab"
                            aria-selected={range === r.key}
                            onClick={() => setRange(r.key)}
                            className={cn(
                              'rounded-md px-2.5 py-0.5 text-xs transition-all',
                              range === r.key
                                ? 'bg-background font-medium text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div key={range} className="animate-fade-in">
                      <WeightChart logs={currentLogs} range={range} />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* 空态 + 录入引导 */
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Scale className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">还没有「{personLabel}」的体重记录</p>
                  <p className="text-xs text-muted-foreground">
                    建议每周固定时间测量一次，长期记录就能看出趋势。从下方表单录入第一条吧。
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 录入表单（默认今天，可补录历史；同日再次保存覆盖） */}
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-medium">记录体重</h2>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">日期</label>
                      <Input
                        type="date"
                        value={date}
                        max={today}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">体重（kg）</label>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="1"
                          max="500"
                          value={weightInput}
                          onChange={(e) => setWeightInput(e.target.value)}
                          placeholder="如 67.5"
                          className="pr-9"
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">备注（可选）</label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="如 晨起空腹、运动后"
                      maxLength={60}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    选择过去的日期可以补录历史记录；同一天再次保存会覆盖当天数据。
                  </p>
                  <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
                    {saving ? '保存中…' : '保存'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 历史列表（倒序，含涨跌与删除） */}
            {descLogs.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-medium">历史记录</h2>
                    <span className="ml-auto text-xs text-muted-foreground">{descLogs.length} 条</span>
                  </div>
                  <div className="divide-y">
                    {descLogs.map((log, i) => {
                      const delta = i < descLogs.length - 1 ? log.weight - descLogs[i + 1].weight : null
                      return (
                        <div key={log.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{dateLabel(log.date)}</div>
                            {log.note && (
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {log.note}
                              </div>
                            )}
                          </div>
                          {delta !== null ? (
                            <DeltaBadge delta={delta} />
                          ) : (
                            <span className="text-xs text-muted-foreground">首次</span>
                          )}
                          <div className="w-16 text-right text-base font-semibold tabular-nums">
                            {fmtWeight(log.weight)}
                            <span className="ml-0.5 text-xs font-normal text-muted-foreground">kg</span>
                          </div>
                          <button
                            onClick={() => setDeleteTarget(log)}
                            aria-label={`删除 ${dateLabel(log.date)} 的记录`}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>

      <AlertDialogRoot
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条记录？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${dateLabel(deleteTarget.date)} 的 ${fmtWeight(deleteTarget.weight)} kg 将被删除，删除后无法恢复，趋势图会重新计算。`
                : '删除后无法恢复，趋势图会重新计算。'}
            </AlertDialogDescription>
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

export default function WeightPage() {
  return (
    <ErrorBoundary>
      <WeightPageInner />
    </ErrorBoundary>
  )
}
