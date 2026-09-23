import { useMemo, useRef, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
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
  CalendarIcon,
  ClockIcon,
  HistoryIcon,
  SearchIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import {
  cn,
  formatDate,
  formatDateTime,
  statusLabel,
  statusTone,
} from '../../lib/utils'
import type { AppointmentWithParties, ResolutionStatus } from '../../types'

const RESOLUTION_TONE: Record<ResolutionStatus, 'green' | 'amber' | 'gray'> = {
  resolved: 'green',
  unresolved: 'amber',
  ongoing: 'gray',
}

/** "2026-08-26T09:00:00Z" -> "9:00 AM" — the time half of a timestamp. */
function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * One row in the left-hand index. Built from inline elements only — the whole
 * card is the button, so it must stay phrasing content (no divs or headings).
 */
function ConsultationCard({
  appointment,
  selected,
  onSelect,
}: {
  appointment: AppointmentWithParties
  selected: boolean
  onSelect: () => void
}) {
  const resolution = appointment.summary?.resolution_status ?? 'ongoing'
  const name = appointment.student?.user?.name ?? 'Student'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
        selected
          ? 'border-brand-300 bg-brand-50/70'
          : 'border-slate-200 bg-white hover:border-[#cbd6e8] hover:bg-slate-50',
      )}
    >
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-slate-800">
          {appointment.reason ?? 'Consultation'}
        </span>
        <span className="truncate text-xs text-slate-500">
          {name}
          {appointment.student?.department
            ? ` · ${DEPARTMENT_LABEL[appointment.student.department]}`
            : ''}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge tone={RESOLUTION_TONE[resolution]}>{resolution}</Badge>
          <span className="text-[11px] text-slate-400">
            {formatDateTime(appointment.scheduled_at)}
          </span>
        </span>
      </span>
    </button>
  )
}

/** Icon + label + value row used in the detail pane's fact grids. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </div>
        <div className="truncate text-sm text-slate-700">{value}</div>
      </div>
    </div>
  )
}

/** Right pane: identity, status, date/time, AI summary and transcript. */
function ConsultationDetail({
  appointment,
}: {
  appointment: AppointmentWithParties
}) {
  const name = appointment.student?.user?.name ?? 'Student'
  const resolution = appointment.summary?.resolution_status ?? 'ongoing'

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
              {appointment.reason ?? 'Consultation'}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Read-only for now — `useUpdateResolution` is already wired if this
                ever needs to become editable. */}
            <Badge tone={statusTone(appointment.status)}>
              {statusLabel(appointment.status)}
            </Badge>
            <Badge tone={RESOLUTION_TONE[resolution]}>{resolution}</Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Fact
            icon={CalendarIcon}
            label="Date"
            value={formatDate(appointment.scheduled_at)}
          />
          <Fact
            icon={ClockIcon}
            label="Time"
            value={formatClock(appointment.scheduled_at)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Transcript">
        <AiSummaryPanel
          summary={appointment.summary?.summary}
          pending={!appointment.summary?.summary}
        />
        {appointment.summary?.transcript ? (
          <details className="mt-3 rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              View transcript
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {appointment.summary.transcript}
            </p>
          </details>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No transcript for this consultation.
          </p>
        )}
      </SectionCard>
    </div>
  )
}

export default function InstructorHistory() {
  const { data: fp } = useProfile()
  const instructorId = fp?.instructor?.id
  const { data: appts, isLoading } = useInstructorAppointments(instructorId)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  /**
   * Falls back to the newest consultation so the detail pane is never empty —
   * and so a search that filters the selected row away lands on a live one
   * rather than a dangling id.
   */
  const selected =
    completed.find((a) => a.id === selectedId) ?? completed[0] ?? null

  const detailRef = useRef<HTMLDivElement>(null)

  /**
   * Scrolls the detail into view when a card is tapped — but only in the
   * stacked layout, and only on an explicit pick. Doing this from an effect
   * keyed on the selection would also fire when a search changes the fallback
   * row, yanking the page down on every keystroke.
   */
  function handleSelect(id: string) {
    setSelectedId(id)
    if (window.matchMedia('(min-width: 1024px)').matches) return
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <PageHeader
        title="Consultation History"
        subtitle="Past sessions and their AI-generated summaries."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Left — searchable index of past consultations */}
        <div className="min-w-0">
          <div className="relative mb-4">
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
                title={search ? 'No matches' : 'No past sessions'}
                hint={
                  search
                    ? 'Try a different student or topic.'
                    : 'Completed consultations and summaries will appear here.'
                }
              />
            </SectionCard>
          ) : (
            <div className="space-y-2">
              {completed.map((a) => (
                <ConsultationCard
                  key={a.id}
                  appointment={a}
                  selected={selected?.id === a.id}
                  onSelect={() => handleSelect(a.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — the selected consultation. Sticky on desktop so the index can
            be scrolled without losing the detail. */}
        <div className="min-w-0">
          <div ref={detailRef} className="lg:sticky lg:top-0">
            {selected ? (
              <ConsultationDetail appointment={selected} />
            ) : (
              !isLoading && (
                <SectionCard>
                  <EmptyState
                    icon={HistoryIcon}
                    title="No consultation selected"
                    hint="Pick a consultation from the list to read its summary."
                  />
                </SectionCard>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
