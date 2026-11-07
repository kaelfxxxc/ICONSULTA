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
import { formatTime } from '../../lib/utils'

const today = new Date().toISOString().slice(0, 10)

function isoWeekday(dateStr: string): number {
  const day = new Date(`${dateStr}T00:00:00`).getDay()
  return day === 0 ? 7 : day
}

function addOneHour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export default function InstructorSchedule() {
  const { data: fp } = useProfile()
  const instructor = fp?.instructor
  const instructorId = instructor?.id
  const { data: availability, isLoading } = useAvailability(instructorId)
  const { add, remove } = useAvailabilityEditor(instructorId)

  const [date, setDate] = useState(today)
  const [start, setStart] = useState('09:00')
  const [error, setError] = useState<string | null>(null)

  // Header metrics, matching the admin schedule card: only available rows count.
  const openSlots = useMemo(
    () => (availability ?? []).filter((s) => s.is_available),
    [availability],
  )
  const activeDays = new Set(openSlots.map((s) => s.day_of_week)).size
  const totalSlots = openSlots.length

  async function handleAdd() {
    setError(null)
    if (!instructorId) return
    if (!/^(?:[01]\d|2[0-2]):00$/.test(start)) {
      setError('Choose a whole-hour start time between 12:00 AM and 10:00 PM.')
      return
    }

    const slotStart = `${start}:00`
    const slotEnd = `${addOneHour(start)}:00`
    const day = isoWeekday(date)
    const duplicate = (availability ?? []).some(
      (s) =>
        s.available_date === date &&
        s.start_time === slotStart &&
        s.end_time === slotEnd,
    )
    if (duplicate) {
      setError(
        `${date} already has a ${formatTime(slotStart)}–${formatTime(slotEnd)} slot.`,
      )
      return
    }

    try {
      await add.mutateAsync({
        instructor_id: instructorId,
        available_date: date,
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
        subtitle="Choose calendar dates and add one-hour slots students can book you for."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add form */}
        <div className="lg:col-span-1">
          <SectionCard title="Add a time slot">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Available date
                </span>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Start
                  </span>
                  <input
                    type="time"
                    min="00:00"
                    max="22:00"
                    step="3600"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>
              {/* Read-only preview of the slot about to be added, so the day
                  and the times read plainly before committing to them. */}
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  One-hour slot
                </div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-800">
                    {date || 'Choose a date'}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-brand-700">
                    {formatTime(`${start}:00`)} –{' '}
                    {formatTime(`${addOneHour(start)}:00`)}
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

        {/* Calendar schedule */}
        <div className="lg:col-span-2">
          <SectionCard title="Calendar schedule">
            {isLoading ? (
              <Loader />
            ) : !(availability ?? []).some((s) => s.available_date) ? (
              <EmptyState
                icon={ClockIcon}
                title="No availability set"
                hint="Add time slots so students can book consultations with you."
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  {(availability ?? [])
                    .filter((s) => s.available_date)
                    .sort((a, b) =>
                      `${a.available_date}${a.start_time}`.localeCompare(
                        `${b.available_date}${b.start_time}`,
                      ),
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {s.available_date}
                          </div>
                          <div className="text-xs text-brand-700">
                            {formatTime(s.start_time)}–{formatTime(s.end_time)}
                          </div>
                        </div>
                        <button
                          onClick={() => remove.mutate(s.id)}
                          disabled={remove.isPending}
                          aria-label="Remove slot"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-brand-500 transition hover:bg-brand-200 hover:text-brand-800 disabled:opacity-50"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
