import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInstructors } from '../../hooks/useInstructors'
import {
  Avatar,
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import {
  ArrowRightIcon,
  BuildingIcon,
  SearchIcon,
  UsersIcon,
} from '../../components/common/icons'
import { DEPARTMENTS } from '../../utils/constants'
import { cn } from '../../lib/utils'
import type { Department, InstructorDirectoryEntry } from '../../types'

export default function StudentDepartments() {
  const [params, setParams] = useSearchParams()
  // The URL (?q=, driven by the topbar) is the single source of truth for search.
  const search = params.get('q') ?? ''
  const [dept, setDept] = useState<Department | 'all'>('all')

  const { data: instructors, isLoading } = useInstructors({ search })

  const grouped = useMemo(() => {
    const list = instructors ?? []
    return DEPARTMENTS.map((d) => ({
      ...d,
      people: list.filter((i) => i.department === d.code),
    }))
  }, [instructors])

  const visible = dept === 'all' ? grouped : grouped.filter((g) => g.code === dept)

  function onSearchChange(value: string) {
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Browse MCC faculty by school and book a consultation."
      />

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, title, or specialization…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Department overview / filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DeptTile
          active={dept === 'all'}
          onClick={() => setDept('all')}
          name="All Schools"
          count={(instructors ?? []).length}
          icon={UsersIcon}
        />
        {grouped.map((g) => (
          <DeptTile
            key={g.code}
            active={dept === g.code}
            onClick={() => setDept(g.code)}
            name={g.name}
            code={g.code}
            count={g.people.length}
            icon={BuildingIcon}
          />
        ))}
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          {visible.map((g) => (
            <SectionCard
              key={g.code}
              title={g.name}
              description={`${g.people.length} faculty member${g.people.length === 1 ? '' : 's'}`}
            >
              {g.people.length === 0 ? (
                <EmptyState
                  icon={BuildingIcon}
                  title="No faculty found"
                  hint={
                    search
                      ? 'Try a different search term.'
                      : 'No instructors are listed for this school yet.'
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {g.people.map((i) => (
                    <FacultyCard key={i.id} instructor={i} />
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

function DeptTile({
  active,
  onClick,
  name,
  code,
  count,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  name: string
  code?: Department
  count: number
  icon: typeof BuildingIcon
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-4 text-left transition',
        active
          ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl',
          active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm font-semibold',
            active ? 'text-white' : 'text-slate-800',
          )}
        >
          {name}
        </div>
        <div
          className={cn(
            'text-xs',
            active ? 'text-navy-200' : 'text-slate-500',
          )}
        >
          {code ? `${code} · ` : ''}
          {count} faculty
        </div>
      </div>
    </button>
  )
}

function FacultyCard({ instructor: i }: { instructor: InstructorDirectoryEntry }) {
  return (
    <Link
      to={`/student/appointments/new?instructor=${i.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
    >
      <Avatar name={i.user?.name} src={i.user?.profile_picture_url} size="md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">
          {i.user?.name}
        </div>
        <div className="truncate text-xs text-slate-500">
          {i.category ?? 'Faculty'}
          {i.office_location ? ` · ${i.office_location}` : ''}
        </div>
        {i.specializations && (
          <div className="mt-0.5 truncate text-xs text-slate-400">
            {i.specializations}
          </div>
        )}
      </div>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  )
}
