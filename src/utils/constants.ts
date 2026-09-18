import type { Department, Role } from '../types'

export const DEPARTMENTS: { code: Department; name: string }[] = [
  { code: 'SOB', name: 'School of Business' },
  { code: 'SOT', name: 'School of Technology' },
  { code: 'SOE', name: 'School of Education' },
]

export const DEPARTMENT_LABEL: Record<Department, string> = {
  SOB: 'School of Business',
  SOT: 'School of Technology',
  SOE: 'School of Education',
}

/** One accent per school — the colour that identifies a department in the UI. */
export const DEPARTMENT_ACCENT: Record<Department, string> = {
  SOB: '#f97316', // orange-500
  SOT: '#ef4444', // red-500
  SOE: '#3b82f6', // blue-500
}

/** Accent for a faculty member with no school on file. */
export const NO_DEPARTMENT_ACCENT = '#94a3b8' // slate-400

// day_of_week is 1..7 (ISO-8601: 1 = Monday … 7 = Sunday). Index 0 is unused.
export const DAY_NAMES = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const ROLE_HOME: Record<Role, string> = {
  student: '/student',
  instructor: '/instructor',
  admin: '/admin',
}

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator',
}

export const APP_NAME = 'ICONSULTA'
