import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import {
  useCancelAppointment,
  useStudentAppointments,
} from '../../hooks/useAppointments'
import { AiSummaryPanel, AppointmentItem } from '../../components/dashboard'
import {
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import {
  CalendarIcon,
  PlusIcon,
  SparklesIcon,
  VideoIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import { cn } from '../../lib/utils'
import type { AppointmentStatus } from '../../types'

type Tab = 'upcoming' | 'pending' | 'completed' | 'all'

const TABS: { key: Tab; label: string; match: (s: AppointmentStatus) => boolean }[] =
  [
    { key: 'upcoming', label: 'Upcoming', match: (s) => s === 'approved' },
    { key: 'pending', label: 'Pending', match: (s) => s === 'pending' },
    { key: 'completed', label: 'Completed', match: (s) => s === 'completed' },
    { key: 'all', label: 'All', match: () => true },
  ]

export default function StudentAppointments() {
  const navigate = useNavigate()
  const { data: fp } = useProfile()
  const studentId = fp?.student?.id
  const { data: appts, isLoading } = useStudentAppointments(studentId)
  const cancel = useCancelAppointment(studentId)

  const [tab, setTab] = useState<Tab>('upcoming')
  const [openSummary, setOpenSummary] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const m = TABS.find((t) => t.key === tab)!.match
    return (appts ?? []).filter((a) => m(a.status))
  }, [appts, tab])

  return (
    <div>
      <PageHeader
        title="My Appointments"
        subtitle="Track and manage your consultation requests."
      >
        <Link
          to="/student/appointments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" /> Book New Session
        </Link>
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = (appts ?? []).filter((a) => t.match(a.status)).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition',
                tab === t.key
                  ? 'bg-navy-900 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-xs',
                  tab === t.key
                    ? 'bg-white/20'
                    : 'bg-slate-100 text-slate-500',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <SectionCard title={undefined} bodyClassName="space-y-3 p-4">
        {isLoading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Nothing here yet"
            hint="Appointments you book will show up in this list."
          />
        ) : (
          filtered.map((a) => (
            <div key={a.id}>
              <AppointmentItem
                appointment={a}
                counterpart={a.instructor?.user?.name ?? 'Instructor'}
                meta={
                  a.instructor?.department
                    ? DEPARTMENT_LABEL[a.instructor.department]
                    : undefined
                }
                actions={
                  <div className="flex items-center gap-2">
                    {a.status === 'approved' && a.video_room_id && (
                      <button
                        onClick={() => navigate(`/session/${a.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                      >
                        <VideoIcon className="h-4 w-4" /> Join
                      </button>
                    )}
                    {a.status === 'completed' && (
                      <button
                        onClick={() =>
                          setOpenSummary(openSummary === a.id ? null : a.id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-violet-600 ring-1 ring-violet-200 transition hover:bg-violet-50"
                      >
                        <SparklesIcon className="h-4 w-4" /> Summary
                      </button>
                    )}
                    {(a.status === 'pending' || a.status === 'approved') && (
                      <button
                        onClick={() => cancel.mutate(a.id)}
                        disabled={cancel.isPending}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                }
              />
              {a.status === 'completed' && openSummary === a.id && (
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
  )
}
