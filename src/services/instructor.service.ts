import { supabase } from '../lib/supabase'
import type { InstructorDirectoryEntry } from '../types'
import type { InstructorFilters } from '../hooks/queryKeys'

// instructor_profiles is readable by every authenticated user (faculty
// directory), and so is the joined users row for role = 'instructor'.
const SELECT = '*, user:users!inner(id,name,email,profile_picture_url)'

export async function listInstructors(
  filters: InstructorFilters = {},
): Promise<InstructorDirectoryEntry[]> {
  let q = supabase.from('instructor_profiles').select(SELECT)
  if (filters.department && filters.department !== 'all') {
    q = q.eq('department', filters.department)
  }
  const { data, error } = await q
  if (error) throw error

  let rows = (data ?? []) as unknown as InstructorDirectoryEntry[]
  const s = filters.search?.trim().toLowerCase()
  if (s) {
    rows = rows.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(s) ||
        (r.category ?? '').toLowerCase().includes(s) ||
        (r.specializations ?? '').toLowerCase().includes(s),
    )
  }
  return rows.sort((a, b) =>
    (a.user?.name ?? '').localeCompare(b.user?.name ?? ''),
  )
}

export async function getInstructor(
  id: string,
): Promise<InstructorDirectoryEntry | null> {
  const { data, error } = await supabase
    .from('instructor_profiles')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as InstructorDirectoryEntry) ?? null
}
