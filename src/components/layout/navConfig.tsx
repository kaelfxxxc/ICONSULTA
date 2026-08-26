import type { ComponentType, SVGProps } from 'react'
import type { Role } from '../../types'
import {
  GridIcon,
  CalendarIcon,
  ClockIcon,
  HistoryIcon,
  SettingsIcon,
  BuildingIcon,
  BarChartIcon,
  UsersIcon,
  CheckCircleIcon,
} from '../common/icons'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

export type NavItem = { to: string; label: string; icon: IconType; end?: boolean }

export interface RoleNav {
  /** Uppercase eyebrow shown above the nav (student/admin portals). */
  eyebrow: string
  subtitle: string
  items: NavItem[]
  /** Primary call-to-action pinned to the bottom of the sidebar. */
  cta: { to: string; label: string }
  /** Whether the topbar shows the global search field. */
  search: boolean
}

export const NAV: Record<Role, RoleNav> = {
  student: {
    eyebrow: 'Academic Portal',
    subtitle: 'Manage Consultations',
    items: [
      { to: '/student', label: 'Dashboard', icon: GridIcon, end: true },
      { to: '/student/appointments', label: 'Appointments', icon: CalendarIcon },
      { to: '/student/schedule', label: 'Schedule', icon: ClockIcon },
      { to: '/student/departments', label: 'Departments', icon: BuildingIcon },
      { to: '/student/analytics', label: 'Analytics', icon: BarChartIcon },
      { to: '/student/settings', label: 'Settings', icon: SettingsIcon },
    ],
    cta: { to: '/student/appointments/new', label: 'Book New Session' },
    search: true,
  },
  instructor: {
    eyebrow: 'Faculty Portal',
    subtitle: 'Consultation Hub',
    items: [
      { to: '/instructor', label: 'Dashboard', icon: GridIcon, end: true },
      { to: '/instructor/requests', label: 'Requests', icon: CheckCircleIcon },
      { to: '/instructor/schedule', label: 'Schedule', icon: ClockIcon },
      { to: '/instructor/history', label: 'History', icon: HistoryIcon },
      { to: '/instructor/settings', label: 'Settings', icon: SettingsIcon },
    ],
    cta: { to: '/instructor/schedule', label: 'New Session' },
    search: false,
  },
  admin: {
    eyebrow: 'Admin Portal',
    subtitle: 'System Management',
    items: [
      { to: '/admin', label: 'Dashboard', icon: GridIcon, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChartIcon },
      { to: '/admin/users', label: 'Users', icon: UsersIcon },
      { to: '/admin/departments', label: 'Departments', icon: BuildingIcon },
      { to: '/admin/schedule', label: 'Schedule', icon: ClockIcon },
      { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    ],
    cta: { to: '/admin/users', label: 'Add User' },
    search: true,
  },
}
