import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useInstructor, useInstructors, useAvailability } from '../../hooks/useInstructors'
import { useCreateAppointment } from '../../hooks/useAppointments'
import {
  Avatar,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
} from '../../components/common/icons'
import {
  DAY_NAMES,
  DEPARTMENT_LABEL,
} from '../../utils/constants'
import { cn, formatTime } from '../../lib/utils'

function isoWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`)
  const js = d.getDay() // 0 = Sun
  return js === 0 ? 7 : js
}

function hourlySlots(start: string, end: string): string[] {
  const sh = Number(start.slice(0, 2))
  const eh = Number(end.slice(0, 2))
  const out: string[] = []
  for (let h = sh; h < eh; h++) out.push(`${String(h).padStart(2, '0')}:00`)
  return out
}

const todayStr = new Date().toISOString().slice(0, 10)

export default function BookSession() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: fp } = useProfile()
  const studentId = fp?.student?.id

  const [instructorId, setInstructorId] = useState<string | null>(
    params.get('instructor'),
  )
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: instructors } = useInstructors()
  const { data: instructor, isLoading: loadingInstructor } =
    useInstructor(instructorId ?? undefined)
  const { data: availability } = useAvailability(instructorId ?? undefined)
  const create = useCreateAppointment()

  const daySlots = useMemo(() => {
    if (!date || !availability) return []
    const wd = isoWeekday(date)
    return availability
      .filter((s) => s.day_of_week === wd && s.is_available)
      .flatMap((s) => hourlySlots(s.start_time, s.end_time))
      .sort()
  }, [date, availability])

  async function handleBook() {
    setError(null)
    if (!studentId) {
      // No student_profiles row resolved — booking cannot be attributed, and
      // the generic "choose a slot" message would send the user in circles.
      setError(
        'Your student profile is still loading. Refresh the page, and if this keeps happening contact an administrator.',
      )
      return
    }
    if (!instructorId || !date || !time || !reason.trim()) {
      setError('Please choose a slot and add a short reason.')
      return
    }
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString()
      await create.mutateAsync({
        student_id: studentId,
        instructor_id: instructorId,
        scheduled_at,
        reason: reason.trim().slice(0, 255),
      })
      navigate('/student/appointments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book session.')
    }
  }

  // Step 1 — pick an instructor
  if (!instructorId) {
    return (
      <div>
        <PageHeader
          title="Book a Session"
          subtitle="Choose a faculty member to consult with."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {(instructors ?? []).map((i) => (
            <button
              key={i.id}
              onClick={() => setInstructorId(i.id)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
            >
              <Avatar
                name={i.user?.name}
                src={i.user?.profile_picture_url}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-800">
                  {i.user?.name}
                </div>
                <div className="truncate text-sm text-slate-500">
                  {i.category ?? 'Faculty'}
                  {i.department ? ` · ${DEPARTMENT_LABEL[i.department]}` : ''}
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-slate-300" />
            </button>
          ))}
          {!instructors && <Loader />}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Book a Session"
        subtitle="Pick a date and time that works for you."
      >
        <button
          onClick={() => {
            setInstructorId(null)
            setDate('')
            setTime('')
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Change faculty
        </button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="1. Select a date">
            <input
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setTime('')
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {date && (
              <p className="mt-2 text-xs text-slate-500">
                {DAY_NAMES[isoWeekday(date)]} — showing this instructor&rsquo;s
                available hours.
              </p>
            )}
          </SectionCard>

          <SectionCard title="2. Choose a time slot">
            {!date ? (
              <p className="text-sm text-slate-500">
                Select a date first to see open slots.
              </p>
            ) : daySlots.length === 0 ? (
              <p className="text-sm text-slate-500">
                No availability on this day. Try another date.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {daySlots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                      time === t
                        ? 'bg-navy-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    )}
                  >
                    <ClockIcon className="h-4 w-4" />
                    {formatTime(`${t}:00`)}
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="3. What would you like to discuss?">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={255}
              placeholder="e.g. Thesis proposal review, course registration help…"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-1 text-right text-xs text-slate-400">
              {reason.length}/255
            </div>
          </SectionCard>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">
              Booking summary
            </h3>
            {loadingInstructor ? (
              <Loader />
            ) : instructor ? (
              <div className="mt-3 flex items-center gap-3">
                <Avatar
                  name={instructor.user?.name}
                  src={instructor.user?.profile_picture_url}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {instructor.user?.name}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {instructor.category ?? 'Faculty'}
                  </div>
                </div>
              </div>
            ) : null}

            <dl className="mt-4 space-y-2 text-sm">
              <SummaryRow label="Date" value={date || '—'} />
              <SummaryRow
                label="Time"
                value={time ? formatTime(`${time}:00`) : '—'}
              />
              <SummaryRow label="Mode" value="Online video" />
            </dl>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleBook}
              disabled={create.isPending || !time || !reason.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-300"
            >
              {create.isPending ? (
                'Requesting…'
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" /> Confirm Booking
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Your instructor will review and approve the request.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  )
}
