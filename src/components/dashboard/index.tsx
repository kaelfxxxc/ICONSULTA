import type { ComponentType, ReactNode, SVGProps } from 'react'
import { cn, formatDateTime, statusLabel, statusTone } from '../../lib/utils'
import { Badge } from '../common'
import { ClockIcon, SparklesIcon } from '../common/icons'
import type { AppointmentWithParties } from '../../types'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

/** Navy month/day chip shown to the left of an appointment. */
export function DateBlock({ iso }: { iso: string | null }) {
  const d = iso ? new Date(iso) : null
  const month = d
    ? d.toLocaleString(undefined, { month: 'short' }).toUpperCase()
    : '—'
  const day = d ? d.getDate() : '—'
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-900 text-white">
      <span className="text-[10px] font-semibold tracking-wide text-navy-200">
        {month}
      </span>
      <span className="text-lg font-bold leading-none">{day}</span>
    </div>
  )
}

/** A single appointment row: date chip, title + status, counterpart, actions. */
export function AppointmentItem({
  appointment,
  counterpart,
  meta,
  actions,
}: {
  appointment: AppointmentWithParties
  counterpart: string
  meta?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <DateBlock iso={appointment.scheduled_at} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-slate-800">
            {appointment.reason ?? 'Consultation'}
          </h3>
          <Badge tone={statusTone(appointment.status)}>
            {statusLabel(appointment.status)}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500">
          {counterpart}
          {meta ? ` · ${meta}` : ''}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <ClockIcon className="h-3.5 w-3.5" />
          {formatDateTime(appointment.scheduled_at)}
        </p>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

/** Big KPI card for the dashboards / analytics. */
export function KpiCard({
  label,
  value,
  delta,
  deltaTone = 'muted',
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: ReactNode
  delta?: string
  deltaTone?: 'up' | 'down' | 'muted'
  icon?: IconType
  variant?: 'default' | 'violet' | 'navy'
}) {
  const shell =
    variant === 'violet'
      ? 'border-violet-200 bg-violet-50'
      : variant === 'navy'
        ? 'border-navy-800 bg-navy-900 text-white'
        : 'border-slate-200 bg-white'
  const labelColor = variant === 'navy' ? 'text-navy-200' : 'text-slate-500'
  const valueColor = variant === 'navy' ? 'text-white' : 'text-slate-900'
  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm', shell)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-medium', labelColor)}>{label}</span>
        {Icon && (
          <span
            className={cn(
              variant === 'navy' ? 'text-navy-300' : 'text-slate-300',
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className={cn('mt-3 text-3xl font-bold tracking-tight', valueColor)}>
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            'mt-1 text-xs font-medium',
            deltaTone === 'up' && 'text-emerald-600',
            deltaTone === 'down' && 'text-red-600',
            deltaTone === 'muted' &&
              (variant === 'navy' ? 'text-navy-300' : 'text-slate-500'),
          )}
        >
          {delta}
        </div>
      )}
    </div>
  )
}

/** Horizontal mini bar chart (volume by department, etc.). */
export function BarList({
  items,
}: {
  items: { label: string; value: number }[]
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{i.label}</span>
            <span className="text-slate-400">{i.value}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100">
            <div
              className="h-2.5 rounded-full bg-brand-500 transition-all"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Violet AI-summary panel used across History / Video / activity feeds. */
export function AiSummaryPanel({
  summary,
  pending,
  title = 'AI Summary',
  className,
}: {
  summary?: string | null
  pending?: boolean
  title?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-violet-200 bg-violet-50/70 p-5',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-violet-700">
        <SparklesIcon className="h-4 w-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {pending ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-violet-500">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
          Compiling insights…
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {summary ?? 'No summary available yet.'}
        </p>
      )}
    </div>
  )
}

/** Labelled status rows for the admin "System Status" card. */
export function SystemStatusList({
  items,
}: {
  items: { label: string; value: string; ok: boolean; icon: IconType }[]
}) {
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <li key={it.label} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-700">
                {it.label}
              </div>
              <div className="text-xs text-slate-400">{it.value}</div>
            </div>
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                it.ok ? 'bg-emerald-500' : 'bg-red-500',
              )}
            />
          </li>
        )
      })}
    </ul>
  )
}
