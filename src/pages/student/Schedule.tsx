import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useStudentAppointments } from '../../hooks/useAppointments'
import {
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
  Badge,
} from '../../components/common'
import { CalendarIcon, VideoIcon } from '../../components/common/icons'
import { cn, formatTime, statusLabel, statusTone } from '../../lib/utils'
import type { AppointmentWithParties } from '../../types'

function groupByDay(list: AppointmentWithParties[]) {
  const map = new Map<string, AppointmentWithParties[]>()
  for (const a of list) {
    const key = a.scheduled_at.slice(0, 10)
    const arr = map.get(key) ?? []
    arr.push(a)
    map.set(key, arr)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

/** Short month + day-of-month for a `scheduled_at` day key, as the rail prints them. */
function dayParts(day: string) {
  const d = new Date(`${day}T00:00:00`)
  return {
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    date: String(d.getDate()),
  }
}

/**
 * One date in the filter rail. Same shape and type as the dashboard `DateBlock`
 * — month over day in a navy chip — but interactive: the active date sits on
 * solid navy, the rest on the pale navy wash. Unlike `DateBlock` it is always
 * visible, since on phones this rail is the only way to filter.
 */
function DateFilterCard({
  month,
  day,
  active,
  onClick,
}: {
  month: ReactNode
  day: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-14 w-14 shrink-0 flex-col items-center mt-3 ml-1 justify-center rounded-xl transition',
        active
          ? 'button-card text-white shadow-sm'
          : 'bg-white text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50',
      )}
    >
      <span
        className={cn(
          'text-[10px] font-semibold tracking-wide',
          active ? 'text-navy-200' : 'text-navy-400',
        )}
      >
        {month}
      </span>
      <span className="text-lg font-bold leading-none">{day}</span>
    </button>
  )
}

export default function StudentSchedule() {
  const navigate = useNavigate()
  const { data: fp } = useProfile()
  const studentId = fp?.student?.id
  const { data: appts, isLoading } = useStudentAppointments(studentId)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const upcoming = useMemo(
    () => (appts ?? []).filter((a) => ['pending', 'approved'].includes(a.status)),
    [appts],
  )

  /** Every day that actually has an appointment, ascending — the rail's dates. */
  const days = useMemo(
    () => [...new Set(upcoming.map((a) => a.scheduled_at.slice(0, 10)))].sort(),
    [upcoming],
  )

  // A day can vanish from `days` (an appointment gets declined or cancelled);
  // falling back to `null` drops the rail back to "All" without an effect.
  const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : null

  const filtered = useMemo(
    () =>
      activeDay
        ? upcoming.filter((a) => a.scheduled_at.slice(0, 10) === activeDay)
        : upcoming,
    [upcoming, activeDay],
  )

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  return (
    <div>
      <PageHeader
        title="My Schedule"
        subtitle="Your upcoming consultations at a glance."
      >
      </PageHeader>

      {!isLoading && days.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            <DateFilterCard
              month="All"
              day={upcoming.length}
              active={activeDay === null}
              onClick={() => setSelectedDay(null)}
            />
            {days.map((day) => {
              const { month, date } = dayParts(day)
              return (
                <DateFilterCard
                  key={day}
                  month={month}
                  day={date}
                  active={activeDay === day}
                  onClick={() => setSelectedDay(day)}
                />
              )
            })}
          </div>
          <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
            {filtered.length} of {upcoming.length} appointment
            {upcoming.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : upcoming.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={CalendarIcon}
            title="Your schedule is clear"
            hint="Once you book a consultation it will appear here, grouped by day."
          />
        </SectionCard>
      ) : groups.length === 0 ? (
        <div className="mt-6">
          <SectionCard>
            <EmptyState
              icon={CalendarIcon}
              title="Nothing scheduled for this date"
              hint="Pick the All card to see everything you have booked."
              action={
                <button
                  onClick={() => setSelectedDay(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Show all dates
                </button>
              }
            />
          </SectionCard>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'long',
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="w-16 text-sm font-semibold text-slate-700">
                      {formatTime(a.scheduled_at.slice(11, 16) + ':00')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {a.reason ?? 'Consultation'}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {a.instructor?.user?.name}
                      </div>
                    </div>
                    <Badge tone={statusTone(a.status)}>
                      {statusLabel(a.status)}
                    </Badge>
                    {a.status === 'approved' && a.video_room_id && (
                      <button
                        onClick={() => navigate(`/session/${a.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                      >
                        <VideoIcon className="h-4 w-4" /> Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
