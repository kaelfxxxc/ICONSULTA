import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useStudentAppointments } from '../../hooks/useAppointments'
import {
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
  Badge,
} from '../../components/common'
import { CalendarIcon, PlusIcon, VideoIcon } from '../../components/common/icons'
import { DateBlock } from '../../components/dashboard'
import { formatTime, statusLabel, statusTone } from '../../lib/utils'
import type { AppointmentWithParties } from '../../types'

function groupByDay(list: AppointmentWithParties[]) {
  const map = new Map<string, AppointmentWithParties[]>()
  for (const a of list) {
    const key = a.scheduled_at.slice(0, 10)
    const arr = map.get(key) ?? []
    arr.push(a)
    map.set(key, arr)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function StudentSchedule() {
  const navigate = useNavigate()
  const { data: fp } = useProfile()
  const studentId = fp?.student?.id
  const { data: appts, isLoading } = useStudentAppointments(studentId)

  const groups = useMemo(() => {
    const upcoming = (appts ?? []).filter((a) =>
      ['pending', 'approved'].includes(a.status),
    )
    return groupByDay(upcoming)
  }, [appts])

  return (
    <div>
      <PageHeader
        title="My Schedule"
        subtitle="Your upcoming consultations at a glance."
      >
        <Link
          to="/student/appointments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" /> Book New Session
        </Link>
      </PageHeader>

      {isLoading ? (
        <Loader />
      ) : groups.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={CalendarIcon}
            title="Your schedule is clear"
            hint="Once you book a consultation it will appear here, grouped by day."
          />
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-3">
                <DateBlock iso={`${day}T00:00:00`} />
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'long',
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="w-16 text-sm font-semibold text-slate-700">
                      {formatTime(a.scheduled_at.slice(11, 16) + ':00')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {a.reason ?? 'Consultation'}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {a.instructor?.user?.name}
                      </div>
                    </div>
                    <Badge tone={statusTone(a.status)}>
                      {statusLabel(a.status)}
                    </Badge>
                    {a.status === 'approved' && a.video_room_id && (
                      <button
                        onClick={() => navigate(`/session/${a.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                      >
                        <VideoIcon className="h-4 w-4" /> Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
