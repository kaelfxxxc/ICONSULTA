import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { useProfile } from '../../hooks/useProfile'
import { useStudentAppointments } from '../../hooks/useAppointments'
import { useInstructors } from '../../hooks/useInstructors'
import {
  AiSummaryPanel,
  AppointmentItem,
} from '../../components/dashboard'
import {
  Avatar,
  Loader,
  PageHeader,
  SectionCard,
  EmptyState,
} from '../../components/common'
import {
  ArrowRightIcon,
  CalendarIcon,
  PlusIcon,
  SparklesIcon,
  VideoIcon,
} from '../../components/common/icons'
import { DEPARTMENTS, DEPARTMENT_LABEL } from '../../utils/constants'
import { cn, formatDate } from '../../lib/utils'
import type { Department } from '../../types'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: fp } = useProfile()
  const studentId = fp?.student?.id
  const { data: appts, isLoading } = useStudentAppointments(studentId)

  const [dept, setDept] = useState<Department | 'all'>('all')
  const { data: instructors } = useInstructors({ department: dept })

  const [openSummary, setOpenSummary] = useState<string | null>(null)

  const { upcoming, recent } = useMemo(() => {
    const list = appts ?? []
    return {
      upcoming: list.filter((a) =>
        ['pending', 'approved'].includes(a.status),
      ),
      recent: list
        .filter((a) => a.status === 'completed')
        .slice(-4)
        .reverse(),
    }
  }, [appts])

  const firstName = (profile?.name ?? 'there').split(' ')[0]

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        subtitle="Here's what's happening with your consultations."
      >
        <Link
          to="/student/appointments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" /> Book New Session
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Upcoming Consultations"
            action={
              <Link
                to="/student/appointments"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            }
            bodyClassName="space-y-3"
          >
            {isLoading ? (
              <Loader />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No upcoming consultations"
                hint="Book a session with a faculty member to get started."
                action={
                  <Link
                    to="/student/appointments/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                  >
                    <PlusIcon className="h-4 w-4" /> Book a session
                  </Link>
                }
              />
            ) : (
              upcoming.map((a) => (
                <AppointmentItem
                  key={a.id}
                  appointment={a}
                  counterpart={a.instructor?.user?.name ?? 'Instructor'}
                  meta={
                    a.instructor?.department
                      ? DEPARTMENT_LABEL[a.instructor.department]
                      : undefined
                  }
                  actions={
                    a.status === 'approved' && a.video_room_id ? (
                      <button
                        onClick={() => navigate(`/session/${a.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                      >
                        <VideoIcon className="h-4 w-4" /> Join
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-amber-600">
                        Awaiting approval
                      </span>
                    )
                  }
                />
              ))
            )}
          </SectionCard>

          {/* Faculty directory */}
          <SectionCard
            title="Faculty Directory"
            description="Browse and book with MCC faculty."
            action={
              <Link
                to="/student/departments"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                All departments
              </Link>
            }
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <FilterPill
                active={dept === 'all'}
                onClick={() => setDept('all')}
              >
                All
              </FilterPill>
              {DEPARTMENTS.map((d) => (
                <FilterPill
                  key={d.code}
                  active={dept === d.code}
                  onClick={() => setDept(d.code)}
                >
                  {d.code}
                </FilterPill>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(instructors ?? []).slice(0, 6).map((i) => (
                <Link
                  key={i.id}
                  to={`/student/appointments/new?instructor=${i.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <Avatar
                    name={i.user?.name}
                    src={i.user?.profile_picture_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {i.user?.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {i.category ?? 'Faculty'}
                      {i.department ? ` · ${i.department}` : ''}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
              {instructors && instructors.length === 0 && (
                <p className="text-sm text-slate-500">
                  No faculty found for this department.
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Aside */}
        <div className="space-y-6">
          {/* Quick action navy card */}
          <div className="rounded-2xl bg-navy-900 p-6 text-white shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <SparklesIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-bold">Need help with a course?</h3>
            <p className="mt-1 text-sm text-navy-200">
              Book a one-on-one video consultation with your instructor in a few
              clicks.
            </p>
            <Link
              to="/student/appointments/new"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
            >
              <PlusIcon className="h-4 w-4" /> Book New Session
            </Link>
          </div>

          <SectionCard title="Recent Activity" bodyClassName="space-y-2">
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                No completed sessions yet.
              </p>
            ) : (
              recent.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {a.reason ?? 'Consultation'}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {a.instructor?.user?.name} · {formatDate(a.scheduled_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setOpenSummary(openSummary === a.id ? null : a.id)
                    }
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700"
                  >
                    <SparklesIcon className="h-3.5 w-3.5" />
                    {openSummary === a.id ? 'Hide summary' : 'View AI Summary'}
                  </button>
                  {openSummary === a.id && (
                    <AiSummaryPanel
                      className="mt-2"
                      summary={a.summary?.summary}
                      pending={!a.summary?.summary}
                    />
                  )}
                </div>
              ))
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
        active
          ? 'bg-navy-900 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  )
}
