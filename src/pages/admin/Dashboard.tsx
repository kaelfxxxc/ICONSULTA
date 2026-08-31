import { Link } from 'react-router-dom'
import { useRealtimeAnalytics } from '../../hooks/useRealtimeAnalytics'
import type { LiveStatus } from '../../hooks/useRealtimeAnalytics'
import { KpiCard, SystemStatusList } from '../../components/dashboard'
import { Loader, PageHeader, SectionCard } from '../../components/common'
import {
  AppointmentTrend,
  DepartmentVolume,
  LiveActivityFeed,
  StatusBreakdown,
} from '../../components/charts'
import {
  ArrowRightIcon,
  BarChartIcon,
  CpuIcon,
  DatabaseIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../../components/common/icons'

/** Realtime connection indicator: green Live, amber connecting, red reconnecting. */
function LivePill({ status }: { status: LiveStatus }) {
  const live = status === 'SUBSCRIBED'
  const connecting = status === 'CLOSED'
  const dot = live
    ? 'bg-emerald-500'
    : connecting
      ? 'bg-amber-500'
      : 'bg-red-500'
  const label = live ? 'Live' : connecting ? 'Connecting…' : 'Reconnecting'

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
      <span
        className={`h-2 w-2 rounded-full ${dot} ${live ? 'animate-pulse' : ''}`}
      />
      {label}
    </span>
  )
}

export default function AdminDashboard() {
  const { data, isLoading, liveEvents, liveStatus } = useRealtimeAnalytics()

  if (isLoading || !data) return <Loader label="Loading dashboard…" />

  const { userCounts, byDepartment, totalAppointments, completionRate, metrics } =
    data

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and key metrics."
      >
        <div className="flex flex-wrap items-center gap-2">
          <LivePill status={liveStatus} />
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            <BarChartIcon className="h-4 w-4" /> Full Analytics
          </Link>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Users"
          value={userCounts.total}
          icon={UsersIcon}
          delta={`${userCounts.active} active`}
          deltaTone="up"
        />
        <KpiCard label="Students" value={userCounts.students} />
        <KpiCard label="Instructors" value={userCounts.instructors} />
        <KpiCard
          label="Appointments (MTD)"
          value={totalAppointments}
          variant="navy"
          delta={`${completionRate.toFixed(1)}% completion`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Consultation Trend"
          description="Daily total vs completed appointments."
          className="lg:col-span-2"
        >
          <AppointmentTrend metrics={metrics} />
        </SectionCard>

        <SectionCard
          title="Status Breakdown"
          description="Month-to-date appointments by status."
        >
          <StatusBreakdown metrics={metrics} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Consultation Volume by Department"
          description="Month-to-date appointment distribution."
          className="lg:col-span-2"
        >
          <DepartmentVolume data={byDepartment} />
        </SectionCard>

        <SectionCard
          title="Live Activity"
          description="New consultation requests as they arrive."
        >
          <LiveActivityFeed events={liveEvents} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

        <Link
          to="/admin/users"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300"
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Manage Users
            </div>
            <div className="text-xs text-slate-500">
              Roles, status, and directory
            </div>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-slate-300" />
        </Link>
      </div>
    </div>
  )
}
