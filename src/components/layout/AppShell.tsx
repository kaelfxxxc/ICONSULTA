import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { APP_NAME, ROLE_LABEL } from '../../utils/constants'
import { initials } from '../../lib/utils'
import { Button } from '../common'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import type { Role } from '../../types'

type NavItem = { to: string; label: string; end?: boolean }

const NAV: Record<Role, NavItem[]> = {
  student: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/faculty', label: 'Faculty' },
    { to: '/student/consultations', label: 'My Consultations' },
  ],
  instructor: [
    { to: '/instructor', label: 'Dashboard', end: true },
    { to: '/instructor/requests', label: 'Requests' },
    { to: '/instructor/availability', label: 'Availability' },
    { to: '/instructor/consultations', label: 'Consultations' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/analytics', label: 'Analytics' },
    { to: '/admin/reports', label: 'Reports' },
  ],
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const role: Role = profile?.role ?? 'student'
  const items = NAV[role]

  function handleSignOut() {
    void signOut().then(() => navigate('/login', { replace: true }))
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="text-lg font-bold text-brand-700">{APP_NAME}</span>
          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                  (isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100')
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-800">
                {profile?.name}
              </div>
              <div className="text-xs text-slate-500">{ROLE_LABEL[role]}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initials(profile?.name)}
            </div>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ' +
                (isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100')
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
