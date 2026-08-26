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
