import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import {
  useAppointmentActions,
  useInstructorAppointments,
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
  CheckIcon,
  SparklesIcon,
  VideoIcon,
  XIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import { cn } from '../../lib/utils'
import type { AppointmentStatus } from '../../types'

type Tab = 'pending' | 'confirmed' | 'completed' | 'all'

const TABS: { key: Tab; label: string; match: (s: AppointmentStatus) => boolean }[] =
  [
    { key: 'pending', label: 'Pending', match: (s) => s === 'pending' },
    { key: 'confirmed', label: 'Confirmed', match: (s) => s === 'approved' },
    { key: 'completed', label: 'Completed', match: (s) => s === 'completed' },
    { key: 'all', label: 'All', match: () => true },
  ]

export default function InstructorRequests() {
  const navigate = useNavigate()
  const { data: fp } = useProfile()
  const instructorId = fp?.instructor?.id
  const { data: appts, isLoading } = useInstructorAppointments(instructorId)
  const { approve, reject, complete } = useAppointmentActions(instructorId)

  const [tab, setTab] = useState<Tab>('pending')
  const [openSummary, setOpenSummary] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const m = TABS.find((t) => t.key === tab)!.match
    return (appts ?? []).filter((a) => m(a.status))
  }, [appts, tab])

  const busy = approve.isPending || reject.isPending || complete.isPending

  return (
    <div>
      <PageHeader
        title="Consultation Requests"
        subtitle="Review, approve, and manage your student consultations."
      />

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
                  tab === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <SectionCard bodyClassName="space-y-3 p-4">
        {isLoading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Nothing here"
            hint="Requests in this category will appear here."
          />
        ) : (
          filtered.map((a) => (
            <div key={a.id}>
              <AppointmentItem
                appointment={a}
                counterpart={a.student?.user?.name ?? 'Student'}
                meta={
                  a.student?.department
                    ? DEPARTMENT_LABEL[a.student.department]
                    : undefined
                }
                actions={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {a.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approve.mutate(a.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckIcon className="h-4 w-4" /> Approve
                        </button>
                        <button
                          onClick={() => reject.mutate({ id: a.id })}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <XIcon className="h-4 w-4" /> Reject
                        </button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <>
                        {a.video_room_id && (
                          <button
                            onClick={() => navigate(`/session/${a.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                          >
                            <VideoIcon className="h-4 w-4" /> Start Call
                          </button>
                        )}
                        <button
                          onClick={() => complete.mutate(a.id)}
                          disabled={busy}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Mark Complete
                        </button>
                      </>
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
