'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { format, parseISO, subMonths, subYears } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { WeightLog } from '@/lib/types'

export type WeightRangeKey = '3m' | '6m' | '1y' | 'all'

export const WEIGHT_RANGES: { key: WeightRangeKey; label: string }[] = [
  { key: '3m', label: '3月' },
  { key: '6m', label: '6月' },
  { key: '1y', label: '1年' },
  { key: 'all', label: '全部' },
]

const CHART_HEIGHT = 190
const PAD = { top: 16, right: 12, bottom: 24, left: 40 }

/** 测量容器实际像素宽度，保证 SVG 文字与圆点在手机上清晰、不缩放变形 */
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/** 时间范围 → 截止日期（YYYY-MM-DD），'all' 返回 null */
function rangeCutoffDate(range: WeightRangeKey, now: Date): string | null {
  if (range === 'all') return null
  const cutoff =
    range === '3m'
      ? subMonths(now, 3)
      : range === '6m'
        ? subMonths(now, 6)
        : subYears(now, 1)
  return format(cutoff, 'yyyy-MM-dd')
}

/** 轴标签 / 数值标注：最多 1 位小数，避免浮点噪声 */
function fmtAxis(v: number): string {
  return String(Math.round(v * 10) / 10)
}

/** X 轴日期标签：跨度超过一年用「yy/M/d」，否则「M/d」 */
function fmtDateLabel(dateStr: string, long: boolean): string {
  const d = parseISO(dateStr)
  return format(d, long ? 'yy/M/d' : 'M/d', { locale: zhCN })
}

interface WeightChartProps {
  /** 当前人的全部记录（按日期升序） */
  logs: WeightLog[]
  /** 时间范围 */
  range: WeightRangeKey
}

export function WeightChart({ logs, range }: WeightChartProps) {
  const { ref, width } = useContainerWidth()
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const filtered = useMemo(() => {
    const cutoff = rangeCutoffDate(range, new Date())
    if (!cutoff) return logs
    return logs.filter((l) => l.date >= cutoff)
  }, [logs, range])

  const geometry = useMemo(() => {
    if (filtered.length === 0 || width <= 0) return null
    const plotW = Math.max(width - PAD.left - PAD.right, 10)
    const plotH = CHART_HEIGHT - PAD.top - PAD.bottom

    const values = filtered.map((l) => l.weight)
    const dataMin = Math.min(...values)
    const dataMax = Math.max(...values)
    // 体重图经典做法：Y 轴从 min−2 到 max+2，绝不从 0 起
    const yMin = Math.max(0, dataMin - 2)
    let yMax = dataMax + 2
    if (yMax - yMin < 4) yMax = yMin + 4

    const times = filtered.map((l) => parseISO(l.date).getTime())
    const tMin = times[0]
    const tMax = times[times.length - 1]
    const span = Math.max(tMax - tMin, 1)

    const xOf = (t: number) =>
      filtered.length === 1
        ? PAD.left + plotW / 2
        : PAD.left + (plotW * (t - tMin)) / span
    const yOf = (v: number) => PAD.top + plotH * (1 - (v - yMin) / (yMax - yMin))

    const points = filtered.map((l, i) => ({
      x: xOf(times[i]),
      y: yOf(l.weight),
      weight: l.weight,
      date: l.date,
    }))

    // Y 轴 4 等分刻度线
    const TICKS = 4
    const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
      const v = yMin + ((yMax - yMin) * i) / TICKS
      return { v, y: yOf(v) }
    })

    // X 轴稀疏标注：最多取 4 个日期
    const n = points.length
    const labelCount = 4
    const labelIdx = Array.from(
      new Set(
        n <= labelCount
          ? points.map((_, i) => i)
          : Array.from({ length: labelCount }, (_, i) =>
              Math.round((i * (n - 1)) / (labelCount - 1))
            )
      )
    ).sort((a, b) => a - b)

    const longLabels = tMax - tMin > 400 * 86400000

    return { plotW, plotH, points, ticks, labelIdx, longLabels }
  }, [filtered, width])

  if (filtered.length === 0) {
    return (
      <div
        ref={ref}
        className="flex h-[190px] items-center justify-center rounded-lg text-sm text-muted-foreground"
      >
        该时间段暂无记录
      </div>
    )
  }

  if (!geometry) {
    return <div ref={ref} style={{ height: CHART_HEIGHT }} />
  }

  const { plotW, plotH, points, ticks, labelIdx, longLabels } = geometry
  const n = points.length
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ')
  const baselineY = PAD.top + plotH
  const areaPath = `${linePath} L${points[n - 1].x.toFixed(2)},${baselineY.toFixed(2)} L${points[0].x.toFixed(2)},${baselineY.toFixed(2)} Z`
  const last = points[n - 1]
  // 稀疏数据（≤8 个点）时在每个点上方标注数值，一眼可读
  const showValueLabels = n <= 8

  return (
    <div ref={ref}>
      <svg width={width} height={CHART_HEIGHT} role="img" aria-label="体重趋势折线图">
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 横向网格线 + Y 轴刻度 */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={t.y}
              x2={PAD.left + plotW}
              y2={t.y}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? undefined : '3 4'}
            />
            <text
              x={PAD.left - 7}
              y={t.y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {fmtAxis(t.v)}
            </text>
          </g>
        ))}

        {/* 面积渐变 + 折线 */}
        <path d={areaPath} fill={`url(#area-${gid})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 数据点：白底描边圆点，一周一条的稀疏数据也清晰可见 */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === n - 1 ? 5 : 3.5}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth={i === n - 1 ? 2 : 1.5}
          />
        ))}

        {/* 最新数据点光环 */}
        <circle
          cx={last.x}
          cy={last.y}
          r={9}
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.22"
          strokeWidth={2}
        />

        {/* 稀疏数据时标注数值 */}
        {showValueLabels &&
          points.map((p, i) => (
            <text
              key={`v-${i}`}
              x={Math.min(Math.max(p.x, PAD.left + 12), PAD.left + plotW - 12)}
              y={p.y - 9}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--muted-foreground)"
            >
              {fmtAxis(p.weight)}
            </text>
          ))}

        {/* X 轴日期标注 */}
        {labelIdx.map((i) => (
          <text
            key={`d-${i}`}
            x={points[i].x}
            y={CHART_HEIGHT - 7}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            fontSize="10"
            fill="var(--muted-foreground)"
          >
            {fmtDateLabel(points[i].date, longLabels)}
          </text>
        ))}
      </svg>
    </div>
  )
}
