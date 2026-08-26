import { useMemo, useState } from 'react'
import { useInstructors, useAvailability } from '../../hooks/useInstructors'
import {
  Avatar,
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import { ClockIcon, UsersIcon } from '../../components/common/icons'
import { DAY_NAMES, DEPARTMENT_LABEL } from '../../utils/constants'
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Faculty list */}
          <div className="lg:col-span-1">
            <SectionCard title="Faculty" bodyClassName="space-y-1 p-2">
              {(instructors ?? []).map((i) => (
                <button
                  key={i.id}
                  onClick={() => setPicked(i.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition',
                    selected === i.id
                      ? 'bg-navy-900 text-white'
                      : 'hover:bg-slate-100',
                  )}
                >
                  <Avatar
                    name={i.user?.name}
                    src={i.user?.profile_picture_url}
                    size="sm"
                  />
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
                </button>
              ))}
            </SectionCard>
          </div>

          {/* Weekly grid */}
          <div className="lg:col-span-2">
            <SectionCard
              title={current?.user?.name ?? 'Availability'}
              description={
                current?.category ?? 'Weekly consultation availability'
              }
            >
              {loadingSlots ? (
                <Loader />
              ) : (availability ?? []).length === 0 ? (
                <EmptyState
                  icon={ClockIcon}
                  title="No availability set"
                  hint="This faculty member hasn't published any time slots yet."
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
                        <span className="w-24 shrink-0 pt-0.5 text-sm font-semibold text-slate-700">
                          {DAY_NAMES[d]}
                        </span>
                        <div className="flex flex-1 flex-wrap gap-2">
                          {slots.length === 0 ? (
                            <span className="text-xs text-slate-400">
                              Unavailable
                            </span>
                          ) : (
                            slots.map((s) => (
                              <span
                                key={s.id}
                                className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                              >
                                {formatTime(s.start_time)}–
                                {formatTime(s.end_time)}
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
      )}
    </div>
  )
}
