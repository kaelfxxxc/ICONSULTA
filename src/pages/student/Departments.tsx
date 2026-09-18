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
  BriefcaseIcon,
  BuildingIcon,
  BookOpenIcon,
  HomeIcon,
  LaptopIcon,
  SearchIcon,
} from '../../components/common/icons'
import { DEPARTMENTS } from '../../utils/constants'
import { cn } from '../../lib/utils'
import type { Department, InstructorDirectoryEntry } from '../../types'

/** One accent per school, used for the active item in the school nav. */
const SCHOOL_ACCENT: Record<Department, string> = {
  SOB: '#f97316', // orange-500
  SOT: '#ef4444', // red-500
  SOE: '#3b82f6', // blue-500
}

/** Accent for "All Schools", which has no school of its own. */
const ALL_ACCENT = '#0f1e3c'

/** One glyph per school for the nav. Education reuses the graduation cap. */
const SCHOOL_ICON: Record<Department, typeof BuildingIcon> = {
  SOB: BriefcaseIcon,
  SOT: LaptopIcon,
  SOE: BookOpenIcon,
}

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

            <nav className="flex flex-col gap-1">
              <SchoolNavItem
                active={dept === 'all'}
                onClick={() => setDept('all')}
                name="All Schools"
                count={total}
                accent={ALL_ACCENT}
                icon={HomeIcon}
              />
              {grouped.map((g) => (
                <SchoolNavItem
                  key={g.code}
                  active={dept === g.code}
                  onClick={() => setDept(g.code)}
                  name={g.name}
                  count={g.people.length}
                  accent={SCHOOL_ACCENT[g.code]}
                  icon={SCHOOL_ICON[g.code]}
                />
              ))}
            </nav>
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

function SchoolNavItem({
  active,
  onClick,
  name,
  count,
  accent,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  name: string
  count: number
  accent: string
  icon: typeof BuildingIcon
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border-l-4 px-3 py-2.5 text-left text-sm font-medium transition',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
      )}
      /*
       * The accent goes inline rather than as a `border-l-[…]` class: cn() is a
       * plain join with no tailwind-merge, so a dynamic class would sit next to
       * `border-l-transparent` and CSS source order would pick the winner. Same
       * approach as `appointmentAccent` in components/dashboard/index.tsx.
       */
      style={{ borderLeftColor: active ? accent : 'transparent' }}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active ? 'text-slate-500' : 'text-slate-400',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
          active ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-500',
        )}
      >
        {count}
      </span>
    </button>
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
