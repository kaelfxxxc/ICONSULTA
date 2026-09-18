import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInstructors } from '../../hooks/useInstructors'
import {
  Avatar,
  EmptyState,
  Loader,
  PageHeader,
  SchoolNav,
  SectionCard,
} from '../../components/common'
import {
  ArrowRightIcon,
  BuildingIcon,
  SearchIcon,
} from '../../components/common/icons'
import { DEPARTMENTS } from '../../utils/constants'
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

  const total = (instructors ?? []).length
  const visible =
    dept === 'all' ? grouped : grouped.filter((g) => g.code === dept)
  // A search matching nothing empties every school at once; say it once at the
  // top level rather than drawing a dashed box per school.
  const noMatches = search !== '' && total === 0

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

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/*
          School nav. `lg:self-start` is load-bearing: grid items stretch to the
          row height by default, and a sticky element with no room to travel
          never moves.

          The SectionCard *inside* is fine. `overflow-hidden` only breaks sticky
          for its own descendants, not for an ancestor — so the rule is that the
          sticky element must not sit inside a SectionCard, which it doesn't.
        */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="Schools" bodyClassName="space-y-3 p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search faculty…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <SchoolNav
              active={dept}
              onSelect={setDept}
              groups={grouped.map((g) => ({
                code: g.code,
                name: g.name,
                count: g.people.length,
              }))}
              total={total}
            />
          </SectionCard>
        </aside>

        <div className="space-y-6">
          {isLoading ? (
            <Loader />
          ) : noMatches ? (
            <SectionCard>
              <EmptyState
                icon={BuildingIcon}
                title="No faculty found"
                hint={`Nothing matches “${search}”. Try a different search term.`}
              />
            </SectionCard>
          ) : (
            visible.map((g) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function FacultyCard({ instructor: i }: { instructor: InstructorDirectoryEntry }) {
  return (
    <Link
      to={`/student/appointments/new?instructor=${i.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-px hover:border-[#cbd6e8] hover:shadow-[0_6px_14px_rgba(32,53,87,0.05)]"
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
