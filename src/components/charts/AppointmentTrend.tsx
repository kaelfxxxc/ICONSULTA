import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsMetric } from '../../types'
import { cn } from '../../lib/utils'
import { ChartTooltip } from './ChartTooltip'
import { CHART } from './theme'

type Range = '7d' | '14d' | '30d' | 'mtd'
const RANGES: { key: Range; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: 'mtd', label: 'MTD' },
]

/** '2026-08-26' -> 'Aug 26' (parsed as local midnight so timezone-safe). */
function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Daily Total vs Completed consultations with a client-side range selector. */
export function AppointmentTrend({ metrics }: { metrics: AnalyticsMetric[] }) {
  const [range, setRange] = useState<Range>('mtd')

  const data = useMemo(() => {
    let rows = metrics.map((m) => ({
      date: m.date,
      Total: m.total_appointments,
      Completed: m.completed_appointments,
    }))
    if (range !== 'mtd') {
      const n = range === '7d' ? 7 : range === '14d' ? 14 : 30
      rows = rows.slice(-n)
    }
    return rows
  }, [metrics, range])

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">
          Daily consultations
        </span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                range === r.key
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: -18 }}
        >
          <CartesianGrid
            stroke={CHART.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: CHART.axis }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART.axis }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            labelFormatter={(label) => shortDate(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
          <Area
            type="monotone"
            dataKey="Total"
            stroke={CHART.total}
            strokeWidth={2}
            fill={CHART.total}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="Completed"
            stroke={CHART.completed}
            strokeWidth={2}
            fill={CHART.completed}
            fillOpacity={0.18}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
