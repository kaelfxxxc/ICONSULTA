import { useMemo, useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { useAvailability } from '../../hooks/useInstructors'
import { useAvailabilityEditor } from '../../hooks/useAvailability'
import {
  EmptyState,
  Loader,
  MetricTile,
  PageHeader,
  SectionCard,
} from '../../components/common'
import { ClockIcon, XIcon } from '../../components/common/icons'
import {
  DAY_NAMES,
  DEPARTMENT_ACCENT,
  NO_DEPARTMENT_ACCENT,
} from '../../utils/constants'
import { formatTime } from '../../lib/utils'
import type { InstructorAvailability } from '../../types'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

export default function InstructorSchedule() {
  const { data: fp } = useProfile()
  const instructor = fp?.instructor
  const instructorId = instructor?.id
  const { data: availability, isLoading } = useAvailability(instructorId)
  const { add, remove } = useAvailabilityEditor(instructorId)

  const [day, setDay] = useState(1)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [error, setError] = useState<string | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<number, InstructorAvailability[]>()
    for (const s of availability ?? []) {
      const arr = map.get(s.day_of_week) ?? []
      arr.push(s)
      map.set(s.day_of_week, arr)
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time))
    return map
  }, [availability])

  // Header metrics, matching the admin schedule card: only available rows count.
  const openSlots = useMemo(
    () => (availability ?? []).filter((s) => s.is_available),
    [availability],
  )
  const activeDays = new Set(openSlots.map((s) => s.day_of_week)).size
  const totalSlots = openSlots.length

  /** School colour for this instructor's availability bars. */
  const accent = instructor?.department
    ? DEPARTMENT_ACCENT[instructor.department]
    : NO_DEPARTMENT_ACCENT

  async function handleAdd() {
    setError(null)
    if (!instructorId) return
    if (end <= start) {
      setError('End time must be after the start time.')
      return
    }

    const slotStart = `${start}:00`
    const slotEnd = `${end}:00`
    // Only an exact repeat is refused — same weekday, same start, same end.
    // Anything that merely overlaps is fine, so 10:00–12:00 can still sit
    // alongside a 10:00–13:00 slot on the same day.
    const duplicate = (availability ?? []).some(
      (s) =>
        s.day_of_week === day &&
        s.start_time === slotStart &&
        s.end_time === slotEnd,
    )
    if (duplicate) {
      setError(
        `${DAY_NAMES[day]} already has a ${formatTime(slotStart)}–${formatTime(
          slotEnd,
        )} slot.`,
      )
      return
    }

    try {
      await add.mutateAsync({
        instructor_id: instructorId,
        day_of_week: day,
        start_time: slotStart,
        end_time: slotEnd,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add slot.')
    }
  }

  return (
    <div>
      <PageHeader
        title="My Availability"
        subtitle="Set the weekly hours students can book you for."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add form */}
        <div className="lg:col-span-1">
          <SectionCard title="Add a time slot">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Day
                </span>
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Start
                  </span>
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    End
                  </span>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>
              {/* Read-only preview of the slot about to be added, so the day
                  and the times read plainly before committing to them. */}
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  You are setting
                </div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-800">
                    {DAY_NAMES[day]}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-brand-700">
                    {formatTime(start)} – {formatTime(end)}
                  </span>
                </div>
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                onClick={handleAdd}
                disabled={add.isPending || !instructorId}
                className="flex w-full items-center justify-center gap-2 rounded-lg button-card px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-navy-800 hover:shadow-lg hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-navy-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100"
              >
                {add.isPending ? 'Adding…' : 'Add slot'}
              </button>
              {totalSlots > 0 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <MetricTile label="Active Days" value={activeDays} />
                  <MetricTile label="Total Slots" value={totalSlots} />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Weekly grid */}
        <div className="lg:col-span-2">
          <SectionCard title="Weekly schedule">
            {isLoading ? (
              <Loader />
            ) : (availability ?? []).length === 0 ? (
              <EmptyState
                icon={ClockIcon}
                title="No availability set"
                hint="Add time slots so students can book consultations with you."
              />
            ) : (
              <div className="space-y-1">
                {DAYS.map((d) => {
                  const slots = byDay.get(d) ?? []
                  const open = slots.length > 0
                  return (
                    <div
                      key={d}
                      className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                    >
                      {/* Availability at a glance — the school's colour on days
                          with slots, neutral on days without. */}
                      <span
                        className="h-7 w-1 shrink-0 rounded-full"
                        style={{
                          background: open ? accent : '#e2e8f0', // slate-200
                        }}
                      />
                      <span className="w-24 shrink-0 text-sm font-semibold text-slate-700">
                        {DAY_NAMES[d]}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {open ? (
                          slots.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 py-0.5 pr-1 pl-2 text-xs font-medium text-brand-700"
                            >
                              {formatTime(s.start_time)}–
                              {formatTime(s.end_time)}
                              {/* Stays here, unlike the admin card's read-only
                                  pills — this one is the editor. */}
                              <button
                                onClick={() => remove.mutate(s.id)}
                                disabled={remove.isPending}
                                aria-label="Remove slot"
                                className="flex h-4 w-4 items-center justify-center rounded-full text-brand-500 transition hover:bg-brand-200 hover:text-brand-800 disabled:opacity-50"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            Unavailable
                          </span>
                        )}
                      </div>
                      {open && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-800 text-[11px] font-bold tabular-nums text-white">
                          {slots.length}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
