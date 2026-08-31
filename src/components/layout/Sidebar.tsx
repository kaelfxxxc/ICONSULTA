import { NavLink, Link } from 'react-router-dom'
import type { Role } from '../../types'
import { ROLE_LABEL } from '../../utils/constants'
import { cn } from '../../lib/utils'
import { Avatar, LogoMark, PlusIcon } from '../common'
import { NAV } from './navConfig'

export function Brand({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* The mark carries its own light ground, so it needs a ring rather than a
          filled badge to read as a tile against the white sidebar. */}
      <LogoMark className="h-auto w-auto py-3" />
    </div>
  )
}

export function Sidebar({
  role,
  name,
  subtitle,
  onNavigate,
}: {
  role: Role
  name: string | null | undefined
  subtitle?: string | null
  onNavigate?: () => void
}) {
  const nav = NAV[role]

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 pb-4 pt-5">
        <Brand />
      </div>

      {/* Context block */}
      {role === 'instructor' ? (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <Avatar name={name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">
              {name ?? 'Instructor'}
            </div>
            <div className="truncate text-xs text-slate-500">
              {subtitle ?? ROLE_LABEL[role]}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {nav.eyebrow}
          </div>
          <div className="text-sm font-medium text-slate-600">{nav.subtitle}</div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-7 border-y border-[#edf0f5]">
        {nav.items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  isActive
                    ? 'bg-navy-50 font-semibold text-navy-900'
                    : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                  {isActive && (
                    <span className="absolute right-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-navy-900" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-5">
        <Link
          to={nav.cta.to}
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
        >
          <PlusIcon className="h-4 w-4" />
          {nav.cta.label}
        </Link>
      </div>
    </aside>
  )
}
