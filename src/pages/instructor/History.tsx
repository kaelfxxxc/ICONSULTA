import { useMemo, useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { useInstructorAppointments } from '../../hooks/useAppointments'
import { AiSummaryPanel } from '../../components/dashboard'
import {
  Avatar,
  Badge,
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import {
  HistoryIcon,
  SearchIcon,
  SparklesIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import { cn, formatDateTime } from '../../lib/utils'
import type { ResolutionStatus } from '../../types'

const RESOLUTION_TONE: Record<ResolutionStatus, 'green' | 'amber' | 'gray'> = {
  resolved: 'green',
  unresolved: 'amber',
  ongoing: 'gray',
}

export default function InstructorHistory() {
  const { data: fp } = useProfile()
  const instructorId = fp?.instructor?.id
  const { data: appts, isLoading } = useInstructorAppointments(instructorId)

  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const completed = useMemo(() => {
    const list = (appts ?? []).filter((a) => a.status === 'completed')
    const s = search.trim().toLowerCase()
    const filtered = s
      ? list.filter(
          (a) =>
            (a.reason ?? '').toLowerCase().includes(s) ||
            (a.student?.user?.name ?? '').toLowerCase().includes(s),
        )
      : list
    return filtered.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
  }, [appts, search])

  return (
    <div>
      <PageHeader
        title="Consultation History"
        subtitle="Past sessions and their AI-generated summaries."
      />

      <div className="relative mb-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student or topic…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {isLoading ? (
        <Loader />
      ) : completed.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={HistoryIcon}
            title="No past sessions"
            hint="Completed consultations and summaries will appear here."
          />
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {completed.map((a) => {
            const resolution = a.summary?.resolution_status ?? 'ongoing'
            const isOpen = open === a.id
            return (
              <div
                key={a.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-4 p-4">
                  <Avatar name={a.student?.user?.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-800">
                        {a.reason ?? 'Consultation'}
                      </h3>
                      <Badge tone={RESOLUTION_TONE[resolution]}>
                        {resolution}
                      </Badge>
                    </div>
                    <div className="truncate text-sm text-slate-500">
                      {a.student?.user?.name ?? 'Student'}
                      {a.student?.department
                        ? ` · ${DEPARTMENT_LABEL[a.student.department]}`
                        : ''}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {formatDateTime(a.scheduled_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(isOpen ? null : a.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
                      isOpen
                        ? 'bg-violet-600 text-white hover:bg-violet-700'
                        : 'text-violet-600 ring-1 ring-violet-200 hover:bg-violet-50',
                    )}
                  >
                    <SparklesIcon className="h-4 w-4" />
                    {isOpen ? 'Hide' : 'Summary'}
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 p-4">
                    <AiSummaryPanel
                      summary={a.summary?.summary}
                      pending={!a.summary?.summary}
                    />
                    {a.summary?.transcript && (
                      <details className="mt-3 rounded-xl border border-slate-200 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-slate-700">
                          View transcript
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {a.summary.transcript}
                        </p>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
