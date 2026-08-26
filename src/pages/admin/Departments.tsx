import { useMemo } from 'react'
import { useInstructors } from '../../hooks/useInstructors'
import { useAnalytics } from '../../hooks/useAnalytics'
import {
  Avatar,
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import { BuildingIcon, UsersIcon } from '../../components/common/icons'
import { KpiCard } from '../../components/dashboard'
import { DEPARTMENTS } from '../../utils/constants'
import type { Department } from '../../types'

export default function AdminDepartments() {
  const { data: instructors, isLoading } = useInstructors()
  const { data: analytics } = useAnalytics()

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

      {isLoading ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
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
          ))}
        </div>
      )}
    </div>
  )
}
