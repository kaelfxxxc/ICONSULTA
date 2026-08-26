import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import type { Role } from '../../types'
import { cn } from '../../lib/utils'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NAV } from './navConfig'

const SEARCH_TARGET: Record<Role, string> = {
  student: '/student/departments',
  instructor: '/instructor/requests',
  admin: '/admin/users',
}

export function DashboardLayout() {
  const { profile } = useAuth()
  const role: Role = profile?.role ?? 'student'
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-full bg-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar role={role} name={profile?.name} />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-slate-900/40 transition-opacity',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            'absolute left-0 top-0 h-full transition-transform',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Sidebar
            role={role}
            name={profile?.name}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          role={role}
          showSearch={NAV[role].search}
          searchTo={SEARCH_TARGET[role]}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
