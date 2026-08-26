import { useMemo, useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { useAvailability } from '../../hooks/useInstructors'
import { useAvailabilityEditor } from '../../hooks/useAvailability'
import {
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import { ClockIcon, PlusIcon, XIcon } from '../../components/common/icons'
import { DAY_NAMES } from '../../utils/constants'
import { formatTime } from '../../lib/utils'
import type { InstructorAvailability } from '../../types'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

export default function InstructorSchedule() {
  const { data: fp } = useProfile()
  const instructorId = fp?.instructor?.id
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

  async function handleAdd() {
    setError(null)
    if (!instructorId) return
    if (end <= start) {
      setError('End time must be after the start time.')
      return
    }
    try {
      await add.mutateAsync({
        instructor_id: instructorId,
        day_of_week: day,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
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
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                onClick={handleAdd}
                disabled={add.isPending || !instructorId}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-300"
              >
                <PlusIcon className="h-4 w-4" />
                {add.isPending ? 'Adding…' : 'Add slot'}
              </button>
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
              <div className="space-y-3">
                {DAYS.map((d) => {
                  const slots = byDay.get(d) ?? []
                  return (
                    <div
                      key={d}
                      className="flex items-start gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="w-24 shrink-0 pt-1 text-sm font-semibold text-slate-700">
                        {DAY_NAMES[d]}
                      </span>
                      <div className="flex flex-1 flex-wrap gap-2">
                        {slots.length === 0 ? (
                          <span className="pt-1 text-xs text-slate-400">
                            No slots
                          </span>
                        ) : (
                          slots.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand-700"
                            >
                              {formatTime(s.start_time)}–{formatTime(s.end_time)}
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
                        )}
                      </div>
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
