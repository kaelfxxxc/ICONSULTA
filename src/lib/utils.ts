import type { AppointmentStatus } from '../types'

/** Join truthy class names (tiny clsx). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** "2026-08-26T09:00:00Z" -> "Aug 26, 2026, 9:00 AM" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "09:00:00" (a Postgres time) -> "9:00 AM" */
export function formatTime(t: string | null | undefined): string {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m ?? 0), 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Tailwind Badge tone for an appointment status. */
export function statusTone(
  status: AppointmentStatus,
): 'gray' | 'green' | 'amber' | 'red' | 'blue' {
  switch (status) {
    case 'approved':
      return 'blue'
    case 'completed':
      return 'green'
    case 'pending':
      return 'amber'
    case 'rejected':
    case 'cancelled':
      return 'red'
    default:
      return 'gray'
  }
}
