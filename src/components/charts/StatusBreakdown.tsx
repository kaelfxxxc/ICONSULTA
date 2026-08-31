import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { AnalyticsMetric, AppointmentStatus } from '../../types'
import { statusLabel } from '../../lib/utils'
import { ChartTooltip } from './ChartTooltip'
import { CHART } from './theme'

type CountKey = Pick<
  AnalyticsMetric,
  | 'pending_appointments'
  | 'approved_appointments'
  | 'completed_appointments'
  | 'rejected_appointments'
>

const SLICE_ORDER: { key: keyof CountKey; status: AppointmentStatus; color: string }[] = [
  { key: 'pending_appointments', status: 'pending', color: CHART.pending },
  { key: 'approved_appointments', status: 'approved', color: CHART.confirmed },
  { key: 'completed_appointments', status: 'completed', color: CHART.completed },
  { key: 'rejected_appointments', status: 'rejected', color: CHART.rejected },
]

/** MTD status distribution donut with a centered total + labelled legend. */
export function StatusBreakdown({ metrics }: { metrics: AnalyticsMetric[] }) {
  const slices = useMemo(() => {
    return SLICE_ORDER.map(({ key, status, color }) => ({
      name: statusLabel(status),
      value: metrics.reduce((s, m) => s + (m[key] ?? 0), 0),
      color,
    })).filter((d) => d.value > 0)
  }, [metrics])

  const total = slices.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div className="relative mx-auto h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              strokeWidth={0}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">Total</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="capitalize text-slate-600">{s.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-800">
              {s.value.toLocaleString()}
            </span>
            <span className="w-10 text-right tabular-nums text-slate-400">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
