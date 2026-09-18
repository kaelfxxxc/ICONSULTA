import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { useProfile } from '../../hooks/useProfile'
import {
  useAppointmentActions,
  useInstructorAppointments,
} from '../../hooks/useAppointments'
import { useAvailability } from '../../hooks/useInstructors'
import { AiSummaryPanel, DateBlock, KpiCard } from '../../components/dashboard'
import {
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  VideoIcon,
  XIcon,
} from '../../components/common/icons'
import { DAY_NAMES } from '../../utils/constants'
import { cn, formatDateTime, formatTime } from '../../lib/utils'
import type { AppointmentWithParties, InstructorAvailability } from '../../types'

export default function InstructorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: fp } = useProfile()
  const instructorId = fp?.instructor?.id

  const { data: appts, isLoading } = useInstructorAppointments(instructorId)
  const { data: availability } = useAvailability(instructorId)
  const { approve, reject } = useAppointmentActions(instructorId)
  const [openSummary, setOpenSummary] = useState<string | null>(null)

  const { upcoming, requests, recent, todayCount } = useMemo(() => {
    const list = appts ?? []
    const today = new Date().toISOString().slice(0, 10)
    return {
      upcoming: list.filter((a) => a.status === 'approved'),
      requests: list.filter((a) => a.status === 'pending'),
      recent: list
        .filter((a) => a.status === 'completed')
        .slice(-4)
        .reverse(),
      todayCount: list.filter(
        (a) => a.status === 'approved' && a.scheduled_at.slice(0, 10) === today,
      ).length,
    }
  }, [appts])

  const firstName = (profile?.name ?? 'there').split(' ')[0]

  return (
    <div>
      <PageHeader
        title={`Good day, ${firstName} 👋`}
        subtitle="Here's your consultation activity."
      >
        <Link
          to="/instructor/schedule"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ClockIcon className="h-4 w-4" /> Manage Availability
        </Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Today's Meetings"
          value={todayCount}
          icon={VideoIcon}
          variant="navy"
        />
        <KpiCard
          label="Pending Requests"
          value={requests.length}
          icon={CalendarIcon}
        />
        <KpiCard
          label="Confirmed Upcoming"
          value={upcoming.length}
          icon={CheckIcon}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_16rem]">
        {/* Left — availability */}
        <div>
          <SectionCard title="Weekly Availability" bodyClassName="p-3">
            <WeeklyAvailability slots={availability ?? []} />
            <Link
              to="/instructor/schedule"
              className="link-more mt-4 flex items-center justify-center gap-1.5"
            >
              Edit availability →
            </Link>
          </SectionCard>
        </div>

        {/* Center — requests, then confirmed meetings */}
        <div className="space-y-6">
          <SectionCard title="Consultation Requests" bodyClassName="space-y-3">
            {requests.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No pending requests right now.
              </p>
            ) : (
              requests.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:-translate-y-px hover:border-[#cbd6e8] hover:shadow-[0_6px_14px_rgba(32,53,87,0.05)]"
                >
                  <DateBlock iso={a.scheduled_at} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">
                      {a.reason ?? 'Consultation'}
                    </div>
                    <div className="truncate text-sm text-slate-500">
                      {a.student?.user?.name ?? 'Student'}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {formatDateTime(a.scheduled_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => approve.mutate(a.id)}
                      disabled={approve.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#d9f7eb] px-3 py-2 text-xs font-semibold text-[#0e9a71] transition hover:bg-[#c3eedd] disabled:opacity-50"
                    >
                      <CheckIcon className="h-4 w-4" /> 
                    </button>
                    <button
                      onClick={() => reject.mutate({ id: a.id })}
                      disabled={reject.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#fbe9ea] px-3 py-2 text-xs font-semibold text-[#b3454b] transition hover:bg-[#f5d9db] disabled:opacity-50"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Upcoming Meetings"
            action={
              <Link
                to="/instructor/requests"
                className="link-more"
              >
                View all →
              </Link>
            }
            bodyClassName="space-y-3"
          >
            {isLoading ? (
              <Loader />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No confirmed meetings"
                hint="Approved consultations will appear here."
              />
            ) : (
              upcoming.map((a) => (
                <MeetingRow
                  key={a.id}
                  appointment={a}
                  onStart={() => navigate(`/session/${a.id}`)}
                />
              ))
            )}
          </SectionCard>
        </div>

        {/* Right — activity feed */}
        <div>
          <SectionCard title="Recent Logs" bodyClassName="space-y-3">
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                No completed sessions yet.
              </p>
            ) : (
              recent.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {a.reason ?? 'Consultation'}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {a.student?.user?.name}
                    </div>
                    <button
                      onClick={() =>
                        setOpenSummary(openSummary === a.id ? null : a.id)
                      }
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      {openSummary === a.id ? 'Hide AI Summary' : 'AI Summary Ready'}
                    </button>
                    {openSummary === a.id && (
                      <AiSummaryPanel
                        className="mt-2"
                        summary={a.summary?.summary}
                        pending={!a.summary?.summary}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function MeetingRow({
  appointment: a,
  onStart,
}: {
  appointment: AppointmentWithParties
  onStart: () => void
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:-translate-y-px hover:border-[#cbd6e8] hover:shadow-[0_6px_14px_rgba(32,53,87,0.05)]">
      <DateBlock iso={a.scheduled_at} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-slate-800">
          {a.reason ?? 'Consultation'}
        </div>
        <div className="truncate text-sm text-slate-500">
          {a.student?.user?.name ?? 'Student'}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <ClockIcon className="h-3.5 w-3.5" />
          {formatDateTime(a.scheduled_at)}
        </div>
      </div>
      {a.video_room_id && (
        <button
          onClick={onStart}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
        >
          <VideoIcon className="h-4 w-4" /> Start Video Call
        </button>
      )}
    </div>
  )
}

function WeeklyAvailability({ slots }: { slots: InstructorAvailability[] }) {
  const byDay = useMemo(() => {
    const map = new Map<number, InstructorAvailability[]>()
    for (const s of slots) {
      if (!s.is_available) continue
      const arr = map.get(s.day_of_week) ?? []
      arr.push(s)
      map.set(s.day_of_week, arr)
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time))
    return map
  }, [slots])

  return (
    <ul className="space-y-2.5">
      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const daySlots = byDay.get(d) ?? []
        return (
          <li key={d}>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  'text-xs font-semibold uppercase tracking-wide',
                  daySlots.length === 0 ? 'text-slate-300' : 'text-slate-500',
                )}
              >
                {DAY_NAMES[d].slice(0, 3)}
              </span>
              {daySlots.length === 0 && (
                <span className="text-xs text-slate-300">—</span>
              )}
            </div>
            {daySlots.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {daySlots.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700"
                  >
                    {formatTime(s.start_time)}–{formatTime(s.end_time)}
                  </span>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
