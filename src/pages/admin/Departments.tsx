import { useMemo, useState } from 'react'
import { useInstructors } from '../../hooks/useInstructors'
import { useAnalytics } from '../../hooks/useAnalytics'
import {
  Avatar,
  EmptyState,
  Loader,
  PageHeader,
  SchoolNav,
  SectionCard,
} from '../../components/common'
import { BuildingIcon, UsersIcon } from '../../components/common/icons'
import { KpiCard } from '../../components/dashboard'
import { DEPARTMENTS } from '../../utils/constants'
import type { Department } from '../../types'

export default function AdminDepartments() {
  const { data: instructors, isLoading } = useInstructors()
  const { data: analytics } = useAnalytics()
  const [dept, setDept] = useState<Department | 'all'>('all')

  const volume = useMemo(() => {
    const map = new Map<Department, number>()
    for (const d of analytics?.byDepartment ?? []) map.set(d.department, d.count)
    return map
  }, [analytics])

  const grouped = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        ...d,
        people: (instructors ?? []).filter((i) => i.department === d.code),
      })),
    [instructors],
  )

  const visible =
    dept === 'all' ? grouped : grouped.filter((g) => g.code === dept)

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Faculty and consultation activity across the three schools."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {grouped.map((g) => (
          <KpiCard
            key={g.code}
            label={g.name}
            value={g.people.length}
            icon={g.code === 'SOB' ? UsersIcon : BuildingIcon}
            delta={`${volume.get(g.code) ?? 0} consultations (MTD)`}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/*
          School nav, matching the student Departments page — minus its search
          field, since this directory is short and admins arrive knowing which
          school they want. No counts either: each school's faculty number is
          already in the KPI cards above, so badges here only repeat it.

          `lg:self-start` is load-bearing: grid items stretch to the row height
          by default, and a sticky element with no room to travel never moves.

          The `<aside>` also must not sit inside a SectionCard: that root carries
          `overflow-hidden`, which disables sticky on all its descendants.
        */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="Schools" bodyClassName="p-3">
            <SchoolNav active={dept} onSelect={setDept} groups={grouped} />
          </SectionCard>
        </aside>

        <div className="space-y-6">
          {isLoading ? (
            <Loader />
          ) : (
            visible.map((g) => (
              <SectionCard
                key={g.code}
                title={`${g.name} (${g.code})`}
                description={`${g.people.length} faculty · ${volume.get(g.code) ?? 0} consultations this month`}
              >
                {g.people.length === 0 ? (
                  <EmptyState
                    icon={BuildingIcon}
                    title="No faculty listed"
                    hint="No instructors are assigned to this school yet."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.people.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <Avatar
                          name={i.user?.name}
                          src={i.user?.profile_picture_url}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {i.user?.name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {i.category ?? 'Faculty'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
