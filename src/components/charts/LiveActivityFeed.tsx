import type { LiveEvent } from '../../hooks/useRealtimeAnalytics'
import { formatDateTime } from '../../lib/utils'
import { EmptyState } from '../common'
import { CalendarIcon } from '../common/icons'

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return formatDateTime(iso)
}

/** Realtime feed of new consultation requests as they arrive. */
export function LiveActivityFeed({ events }: { events: LiveEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="No live activity yet"
        hint="New consultation requests will appear here in real time."
      />
    )
  }

  return (
    <ul className="scroll-slim -mr-1 max-h-[240px] space-y-2 overflow-y-auto pr-1">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">
              {e.reason ?? 'New consultation request'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {formatDateTime(e.scheduledAt)} · {timeAgo(e.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
