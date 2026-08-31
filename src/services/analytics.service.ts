import { supabase } from '../lib/supabase'
import type { RealtimeChannel, RealtimeChannelState } from '@supabase/supabase-js'
import type {
  AnalyticsMetric,
  Appointment,
  Department,
  Role,
  User,
  UserStatus,
} from '../types'
import type { AdminUserFilters } from '../hooks/queryKeys'

export const ADMIN_USERS_PAGE_SIZE = 8

export interface AdminOverview {
  totalAppointments: number
  completedAppointments: number
  completionRate: number // percent (0–100)
  avgDurationMin: number
  systemHealth: number
  userCounts: {
    students: number
    instructors: number
    admins: number
    active: number
    total: number
  }
  byDepartment: { department: Department; count: number }[]
  metrics: AnalyticsMetric[]
}

function firstOf<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null
  return (v as T) ?? null
}

/** Admin KPIs: month-to-date metric sums + user counts + volume by department. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const [metricsRes, usersRes, apptRes] = await Promise.all([
    supabase
      .from('analytics_metrics')
      .select('*')
      .gte('date', monthStart)
      .order('date', { ascending: true }),
    supabase.from('users').select('role,status'),
    supabase
      .from('appointments')
      .select('id, instructor:instructor_profiles(department)'),
  ])
  if (metricsRes.error) throw metricsRes.error
  if (usersRes.error) throw usersRes.error
  if (apptRes.error) throw apptRes.error

  const metrics = (metricsRes.data ?? []) as AnalyticsMetric[]
  const totalAppointments = metrics.reduce(
    (s, m) => s + (m.total_appointments ?? 0),
    0,
  )
  const completedAppointments = metrics.reduce(
    (s, m) => s + (m.completed_appointments ?? 0),
    0,
  )
  const completionRate = totalAppointments
    ? (completedAppointments / totalAppointments) * 100
    : 0
  const durations = metrics
    .map((m) => m.avg_session_duration)
    .filter((d): d is number => d != null)
  const avgDurationMin = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0

  const users = (usersRes.data ?? []) as { role: Role; status: UserStatus }[]
  const userCounts = {
    students: users.filter((u) => u.role === 'student').length,
    instructors: users.filter((u) => u.role === 'instructor').length,
    admins: users.filter((u) => u.role === 'admin').length,
    active: users.filter((u) => u.status === 'active').length,
    total: users.length,
  }

  const appts = (apptRes.data ?? []) as Record<string, unknown>[]
  const deptCount = new Map<Department, number>()
  for (const a of appts) {
    const inst = firstOf<{ department: Department | null }>(a.instructor)
    const d = inst?.department
    if (d) deptCount.set(d, (deptCount.get(d) ?? 0) + 1)
  }
  const byDepartment = (['SOB', 'SOT', 'SOE'] as Department[]).map(
    (department) => ({ department, count: deptCount.get(department) ?? 0 }),
  )

  return {
    totalAppointments,
    completedAppointments,
    completionRate,
    avgDurationMin,
    systemHealth: 98, // cosmetic composite (matches the reference design)
    userCounts,
    byDepartment,
    metrics,
  }
}

export interface AdminUserRow extends User {
  department: Department | null
}

export interface AdminUsersPage {
  rows: AdminUserRow[]
  count: number
  page: number
  pageSize: number
}

/** Paginated user directory for the admin table (RLS: users_admin_all). */
export async function listAdminUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUsersPage> {
  const page = Math.max(1, filters.page ?? 1)
  const from = (page - 1) * ADMIN_USERS_PAGE_SIZE
  const to = from + ADMIN_USERS_PAGE_SIZE - 1

  let q = supabase
    .from('users')
    .select(
      '*, student:student_profiles(department), instructor:instructor_profiles(department)',
      { count: 'exact' },
    )
  if (filters.role && filters.role !== 'all') q = q.eq('role', filters.role)
  const s = filters.search?.trim()
  if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%`)
  q = q.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await q
  if (error) throw error

  const rows = (data ?? []).map((u: Record<string, unknown>): AdminUserRow => {
    const student = firstOf<{ department: Department | null }>(u.student)
    const instructor = firstOf<{ department: Department | null }>(u.instructor)
    const department = student?.department ?? instructor?.department ?? null
    return { ...(u as unknown as User), department }
  })

  return { rows, count: count ?? 0, page, pageSize: ADMIN_USERS_PAGE_SIZE }
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
): Promise<void> {
  const { error } = await supabase.from('users').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateUserRole(id: string, role: Role): Promise<void> {
  const { error } = await supabase.from('users').update({ role }).eq('id', id)
  if (error) throw error
}

/** Live admin dashboard: subscribe to analytics_metrics changes (any event) and
 *  to new appointment requests. analytics_metrics is admin-only via RLS, so only
 *  admins receive these events. Returns an unsubscribe function. */
export function subscribeAdminAnalytics(
  onMetricsChange: () => void,
  onAppointmentInsert: (appointment: Appointment) => void,
  onStatus?: (status: RealtimeChannelState) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel('admin-live-analytics')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'analytics_metrics' },
      () => onMetricsChange(),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'appointments' },
      (payload) => {
        onAppointmentInsert(payload.new as unknown as Appointment)
      },
    )
    .subscribe((status) => onStatus?.(status))

  return () => {
    void supabase.removeChannel(channel)
  }
}
