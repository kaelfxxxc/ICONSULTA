import type { Department, Role } from '../types'

// Central React Query key registry — keeps queryKey shapes consistent between
// the hooks that read and the mutations that invalidate.

export interface InstructorFilters {
  department?: Department | 'all'
  search?: string
}
export interface AdminUserFilters {
  role?: Role | 'all'
  search?: string
  page?: number
}

export const qk = {
  profile: (userId?: string) => ['profile', userId] as const,
  instructors: (filters?: InstructorFilters) => ['instructors', filters ?? {}] as const,
  instructor: (id?: string) => ['instructor', id] as const,
  availability: (instructorProfileId?: string) =>
    ['availability', instructorProfileId] as const,
  appointmentsStudent: (studentProfileId?: string) =>
    ['appointments', 'student', studentProfileId] as const,
  appointmentsInstructor: (instructorProfileId?: string) =>
    ['appointments', 'instructor', instructorProfileId] as const,
  appointment: (id?: string) => ['appointment', id] as const,
  summary: (appointmentId?: string) => ['summary', appointmentId] as const,
  videoSession: (appointmentId?: string) => ['videoSession', appointmentId] as const,
  notifications: (userId?: string) => ['notifications', userId] as const,
  analytics: () => ['analytics'] as const,
  adminUsers: (filters?: AdminUserFilters) => ['adminUsers', filters ?? {}] as const,
}
