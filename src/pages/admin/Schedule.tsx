import { useMemo, useState } from 'react'
import {
  useInstructors,
  useAvailability,
  useAllAvailability,
} from '../../hooks/useInstructors'
import {
  Avatar,
  DepartmentBadge,
  EmptyState,
  Loader,
  MetricTile,
  PageHeader,
  SectionCard,
} from '../../components/common'
import { ClockIcon, UsersIcon } from '../../components/common/icons'
import {
  DAY_NAMES,
  DEPARTMENT_ACCENT,
  DEPARTMENT_LABEL,
  NO_DEPARTMENT_ACCENT,
} from '../../utils/constants'
import { cn, formatTime } from '../../lib/utils'
import type { InstructorAvailability } from '../../types'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

export default function AdminSchedule() {
  const { data: instructors, isLoading } = useInstructors()
  const [picked, setPicked] = useState<string | null>(null)

  // Default to the first instructor until the admin picks one (derived, no effect).
  const selected = picked ?? instructors?.[0]?.id ?? null

  const { data: availability, isLoading: loadingSlots } =
    useAvailability(selected ?? undefined)

  // The selector shows a day count on every row, so it needs all faculty at
  // once rather than one request per instructor.
  const { data: allAvailability } = useAllAvailability()

  /** Total available slots per instructor, keyed by instructor profile id. */
  const slotCountByInstructor = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of allAvailability ?? []) {
      if (!s.is_available) continue
      map.set(s.instructor_id, (map.get(s.instructor_id) ?? 0) + 1)
    }
    return map
  }, [allAvailability])

  const byDay = useMemo(() => {
    const map = new Map<number, InstructorAvailability[]>()
    for (const s of availability ?? []) {
      if (!s.is_available) continue
      const arr = map.get(s.day_of_week) ?? []
      arr.push(s)
      map.set(s.day_of_week, arr)
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time))
    return map
  }, [availability])

  const current = instructors?.find((i) => i.id === selected)
  const accent = current?.department
    ? DEPARTMENT_ACCENT[current.department]
    : NO_DEPARTMENT_ACCENT

  // byDay only holds days with at least one available slot, so its size is the
  // active-day count and its contents total the slot count.
  const activeDays = byDay.size
  const totalSlots = useMemo(
    () => [...byDay.values()].reduce((n, arr) => n + arr.length, 0),
    [byDay],
  )

  return (
    <div>
      <PageHeader
        title="Faculty Schedules"
        subtitle="Review the weekly availability of any faculty member."
      />

      {isLoading ? (
        <Loader />
      ) : (instructors ?? []).length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={UsersIcon}
            title="No faculty found"
            hint="Instructor availability will appear here once faculty are added."
          />
        </SectionCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          {/* Faculty list */}
          <div>
            <SectionCard title="Faculty" bodyClassName="space-y-4 p-2">
              {(instructors ?? []).map((i) => (
                <button
                  key={i.id}
                  onClick={() => setPicked(i.id)}
                  aria-pressed={selected === i.id}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition',
                    selected === i.id
                      ? 'bg-card text-white'
                      : 'border-[1.5px] border-transparent shadow-[0_8px_24px_rgba(13,27,75,0.2)] hover:bg-slate-100',
                  )}
                >
                  {/* School dot. The ring takes the colour of whatever the row
                      is sitting on, so the dot reads as cut out of the avatar
                      rather than pasted on top. */}
                  <span className="relative shrink-0">
                    <Avatar
                      name={i.user?.name}
                      src={i.user?.profile_picture_url}
                      size="sm"
                    />
                    <span
                      className={cn(
                        'absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2',
                        selected === i.id ? 'ring-navy-800' : 'ring-white',
                      )}
                      style={{
                        background: i.department
                          ? DEPARTMENT_ACCENT[i.department]
                          : NO_DEPARTMENT_ACCENT,
                      }}
                      title={
                        i.department
                          ? DEPARTMENT_LABEL[i.department]
                          : 'No school on file'
                      }
                    />
                  </span>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        'truncate text-sm font-medium',
                        selected === i.id ? 'text-white' : 'text-slate-800',
                      )}
                    >
                      {i.user?.name}
                    </div>
                    <div
                      className={cn(
                        'truncate text-xs',
                        selected === i.id ? 'text-navy-200' : 'text-slate-500',
                      )}
                    >
                      {i.department
                        ? DEPARTMENT_LABEL[i.department]
                        : 'Faculty'}
                    </div>
                  </div>

                  {/* Total slot count, pushed to the row's right edge. */}
                  <span className="ml-auto shrink-0 text-right">
                    <span
                      className={cn(
                        'block text-lg leading-none font-black tabular-nums text-center',
                        selected === i.id ? 'text-white' : 'text-slate-800',
                      )}
                    >
                      {slotCountByInstructor.get(i.id) ?? 0}
                    </span>
                    <span
                      className={cn(
                        'block text-[10px] font-semibold tracking-wide uppercase',
                        selected === i.id ? 'text-navy-200' : 'text-slate-400',
                      )}
                    >
                      slots
                    </span>
                  </span>
                </button>
              ))}
            </SectionCard>
          </div>

          {/* Weekly grid */}
          <div>
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <span className="truncate text-base font-bold text-slate-900">
                    {current?.user?.name ?? 'Availability'}
                  </span>
                  {current?.department && (
                    <DepartmentBadge code={current.department} />
                  )}
                </span>
              }
              description={
                current?.category ?? 'Weekly consultation availability'
              }
            >
              {loadingSlots ? (
                <Loader />
              ) : totalSlots === 0 ? (
                <EmptyState
                  icon={ClockIcon}
                  title="No availability set"
                  hint="This faculty member hasn't published any time slots yet."
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
                        {/* Availability at a glance — the school's colour on
                            days with slots, neutral on days without. */}
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
                                className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                              >
                                {formatTime(s.start_time)}–
                                {formatTime(s.end_time)}
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
      )}
    </div>
  )
}
