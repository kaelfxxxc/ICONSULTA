import { Link } from 'react-router-dom'
import { useAnalytics } from '../../hooks/useAnalytics'
import { BarList, KpiCard, SystemStatusList } from '../../components/dashboard'
import { Loader, PageHeader, SectionCard } from '../../components/common'
import {
  ArrowRightIcon,
  BarChartIcon,
  CpuIcon,
  DatabaseIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL } from '../../utils/constants'

export default function AdminDashboard() {
  const { data, isLoading } = useAnalytics()

  if (isLoading || !data) return <Loader label="Loading dashboard…" />

  const { userCounts, byDepartment, totalAppointments, completionRate } = data

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and key metrics."
      >
        <Link
          to="/admin/analytics"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <BarChartIcon className="h-4 w-4" /> Full Analytics
        </Link>
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
        <div className="lg:col-span-2">
          <SectionCard
            title="Consultation Volume by Department"
            description="Month-to-date appointment distribution."
          >
            <BarList
              items={byDepartment.map((d) => ({
                label: DEPARTMENT_LABEL[d.department],
                value: d.count,
              }))}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
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
    </div>
  )
}
