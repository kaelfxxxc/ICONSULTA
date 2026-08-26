import { useAnalytics } from '../../hooks/useAnalytics'
import { BarList, KpiCard, SystemStatusList } from '../../components/dashboard'
import { Loader, PageHeader, SectionCard } from '../../components/common'
import {
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import type { AdminOverview } from '../../services/analytics.service'

function exportCsv(data: AdminOverview) {
  const headers = [
    'date',
    'total_appointments',
    'approved',
    'pending',
    'rejected',
    'completed',
    'avg_session_duration',
  ]
  const rows = data.metrics.map((m) =>
    [
      m.date,
      m.total_appointments,
      m.approved_appointments,
      m.pending_appointments,
      m.rejected_appointments,
      m.completed_appointments,
      m.avg_session_duration ?? '',
    ].join(','),
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `iconsulta-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AdminAnalytics() {
  const { data, isLoading } = useAnalytics()

  if (isLoading || !data) return <Loader label="Loading analytics…" />

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Platform-wide consultation metrics (month to date)."
      >
        <button
          onClick={() => exportCsv(data)}
          disabled={data.metrics.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-300"
        >
          <DownloadIcon className="h-4 w-4" /> Export Report
        </button>
      </PageHeader>

      {/* KPI board */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Appointments"
          value={data.totalAppointments.toLocaleString()}
          delta="Month to date"
        />
        <KpiCard
          label="Completion Rate"
          value={`${data.completionRate.toFixed(1)}%`}
          delta={`${data.completedAppointments} completed`}
          deltaTone="up"
        />
        <KpiCard
          label="Avg. Duration"
          value={`${Math.round(data.avgDurationMin)} min`}
          delta="Per session"
        />
        <KpiCard
          label="System Health"
          value={`${data.systemHealth}/100`}
          variant="violet"
          delta="All systems nominal"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Volume by Department"
            description="Where consultations are concentrated."
          >
            <BarList
              items={data.byDepartment.map((d) => ({
                label: DEPARTMENT_LABEL[d.department],
                value: d.count,
              }))}
            />
          </SectionCard>

          <SectionCard
            title="User Base"
            description="Accounts by role."
          >
            <BarList
              items={[
                { label: 'Students', value: data.userCounts.students },
                { label: 'Instructors', value: data.userCounts.instructors },
                { label: 'Administrators', value: data.userCounts.admins },
              ]}
            />
          </SectionCard>
        </div>

        <SectionCard title="System Status">
          <SystemStatusList
            items={[
              {
                label: 'API Server',
                value: 'Operational',
                ok: true,
                icon: ServerIcon,
              },
              {
                label: 'Database',
                value: 'Healthy',
                ok: true,
                icon: DatabaseIcon,
              },
              {
                label: 'Auth Service',
                value: 'Operational',
                ok: true,
                icon: ShieldCheckIcon,
              },
              {
                label: 'AI Summaries',
                value: 'Running',
                ok: true,
                icon: CpuIcon,
              },
            ]}
          />
        </SectionCard>
      </div>
    </div>
  )
}
