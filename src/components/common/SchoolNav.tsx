import { cn } from '../../lib/utils'
import {
  BookOpenIcon,
  BriefcaseIcon,
  BuildingIcon,
  HomeIcon,
  LaptopIcon,
} from './icons'
import type { Department } from '../../types'

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

export interface SchoolNavGroup {
  code: Department
  name: string
  /** Omit to hide this row's badge — the admin nav shows names only. */
  count?: number
}

/**
 * Vertical school picker shared by the student and admin Departments pages.
 *
 * Deliberately just the nav list — the student page's search input lives beside
 * it in the page, because the admin page has none. Counts are likewise optional:
 * pass them and each row gets a badge, omit them and the rows are names only,
 * which is what the admin page wants.
 */
export function SchoolNav({
  active,
  onSelect,
  groups,
  total,
}: {
  active: Department | 'all'
  onSelect: (value: Department | 'all') => void
  groups: SchoolNavGroup[]
  /** Count for "All Schools". Omit to hide that badge too. */
  total?: number
}) {
  return (
    <nav className="flex flex-col gap-1">
      <SchoolNavItem
        active={active === 'all'}
        onClick={() => onSelect('all')}
        name="All Schools"
        count={total}
        accent={ALL_ACCENT}
        icon={HomeIcon}
      />
      {groups.map((g) => (
        <SchoolNavItem
          key={g.code}
          active={active === g.code}
          onClick={() => onSelect(g.code)}
          name={g.name}
          count={g.count}
          accent={SCHOOL_ACCENT[g.code]}
          icon={SCHOOL_ICON[g.code]}
        />
      ))}
    </nav>
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
  count?: number
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
      {count !== undefined && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            active
              ? 'bg-slate-100 text-slate-700'
              : 'bg-slate-200/70 text-slate-500',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
