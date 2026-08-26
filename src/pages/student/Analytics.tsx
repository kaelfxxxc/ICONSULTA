import { useMemo } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { useStudentAppointments } from '../../hooks/useAppointments'
import {
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import { BarChartIcon } from '../../components/common/icons'
import { BarList, KpiCard } from '../../components/dashboard'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import type { Department } from '../../types'

export default function StudentAnalytics() {
  const { data: fp } = useProfile()
  const studentId = fp?.student?.id
  const { data: appts, isLoading } = useStudentAppointments(studentId)

  const stats = useMemo(() => {
    const list = appts ?? []
    const total = list.length
    const completed = list.filter((a) => a.status === 'completed').length
    const upcoming = list.filter((a) =>
      ['pending', 'approved'].includes(a.status),
    ).length
    const cancelled = list.filter((a) =>
      ['cancelled', 'rejected'].includes(a.status),
    ).length
    const completionRate = total ? Math.round((completed / total) * 100) : 0

    const deptCount = new Map<Department, number>()
    const facultyCount = new Map<string, number>()
    for (const a of list) {
      const d = a.instructor?.department
      if (d) deptCount.set(d, (deptCount.get(d) ?? 0) + 1)
      const fac = a.instructor?.user?.name
      if (fac) facultyCount.set(fac, (facultyCount.get(fac) ?? 0) + 1)
    }
    const byDept = (['SOB', 'SOT', 'SOE'] as Department[])
      .map((d) => ({ label: DEPARTMENT_LABEL[d], value: deptCount.get(d) ?? 0 }))
      .filter((r) => r.value > 0)
    const byFaculty = [...facultyCount.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    return {
      total,
      completed,
      upcoming,
      cancelled,
      completionRate,
      byDept,
      byFaculty,
    }
  }, [appts])

  if (isLoading) return <Loader label="Loading your analytics…" />

  return (
    <div>
      <PageHeader
        title="My Analytics"
        subtitle="Insights from your consultation history."
      />

      {stats.total === 0 ? (
        <SectionCard>
          <EmptyState
            icon={BarChartIcon}
            title="No data yet"
            hint="Book and attend consultations to build up your analytics."
          />
        </SectionCard>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total Consultations" value={stats.total} />
            <KpiCard
              label="Completed"
              value={stats.completed}
              delta={`${stats.completionRate}% completion rate`}
              deltaTone="up"
            />
            <KpiCard label="Upcoming" value={stats.upcoming} variant="navy" />
            <KpiCard
              label="Cancelled / Rejected"
              value={stats.cancelled}
              deltaTone="muted"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Consultations by Department"
              description="Where you spend your consultation time."
            >
              {stats.byDept.length ? (
                <BarList items={stats.byDept} />
              ) : (
                <p className="text-sm text-slate-500">No department data.</p>
              )}
            </SectionCard>

            <SectionCard
              title="Most Consulted Faculty"
              description="Your top instructors by session count."
            >
              {stats.byFaculty.length ? (
                <BarList items={stats.byFaculty} />
              ) : (
                <p className="text-sm text-slate-500">No faculty data.</p>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}
