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
    <span className="inline-flex items-center gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-emerald-400">
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
      <div className="mb-6 px-6 py-4 flex w-full flex-col gap-4 bg-header rounded-2xl">
        <PageHeader
          title=''
          titlewithbg="Admin Dashboard"
          subtitle="System overview and key metrics."
        >
          <div className="flex flex-wrap items-center gap-2">
            <LivePill status={liveStatus} />
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-2 rounded-2xl glass-card border border-white/45 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:border-white/45 hover:bg-white/20 hover:shadow-[0_8px_20px_rgba(5,15,40,0.35)] active:translate-y-0"
            >
              <BarChartIcon className="h-4 w-4" /> Full Analytics
            </Link>
          </div>
        </PageHeader>

        <div className="pt-3 grid gap-4 grid-cols-2 border-t border-slate-600 lg:grid-cols-4">
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
            variant="glass"
            delta={`${completionRate.toFixed(1)}% completion`}
          />
        </div>
      </div>

      {/*
        Center gets twice the width of either side — it holds the two charts,
        which need the horizontal room, while the side columns hold a feed, a
        donut and a health list that read fine narrow. Ratios rather than the
        instructor dashboard's fixed rem sides, because these side columns
        carry more content than a compact availability list does.
      */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left — live feed, then the users shortcut */}
        <div className="space-y-6">
          <SectionCard
            title="Live Activity"
            description="New consultation requests as they arrive."
          >
            <LiveActivityFeed events={liveEvents} />
          </SectionCard>

          <Link
            to="/admin/users"
            className="bg-card group flex items-center justify-between rounded-2xl p-5 text-white shadow-sm transition hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(13,27,75,0.28)]"
          >
            <div>
              <div className="text-sm font-semibold">Manage Users</div>
              <div className="text-xs text-navy-200">
                Roles, status, and directory
              </div>
            </div>
            <ArrowRightIcon className="h-5 w-5 shrink-0 text-navy-300 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Center — trend, then volume. Both span the column width. */}
        <div className="space-y-6">
          <SectionCard
            title="Consultation Trend"
            description="Daily total vs completed appointments."
            className="border-t-4 border-t-[#83a3dd]"
          >
            <AppointmentTrend metrics={metrics} />
          </SectionCard>

          <SectionCard
            title="Consultation Volume by Department"
            description="Month-to-date appointment distribution."
            className="border-t-4 border-t-[#d2a15c]"
          >
            <DepartmentVolume data={byDepartment} />
          </SectionCard>
        </div>

        {/* Right — breakdown, then the health list */}
        <div className="space-y-6">
          <SectionCard
            title="Status Breakdown"
            description="Month-to-date appointments by status."
            className="border-t-4 border-t-[#9a8ad1]"
          >
            <StatusBreakdown metrics={metrics} />
          </SectionCard>

          <SectionCard title="System Status">
            <SystemStatusList
              compact
              items={[
                { label: 'API Server', value: 'Operational', ok: true },
                { label: 'Database', value: 'Healthy', ok: true },
                { label: 'Auth Service', value: 'Operational', ok: true },
                { label: 'AI Summaries', value: 'Running', ok: true },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
