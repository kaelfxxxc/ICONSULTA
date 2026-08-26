import { supabase } from '../lib/supabase'
import type { InstructorAvailability } from '../types'

/** Weekly availability for an instructor (readable by all authenticated). */
export async function listAvailability(
  instructorProfileId: string,
): Promise<InstructorAvailability[]> {
  const { data, error } = await supabase
    .from('instructor_availability')
    .select('*')
    .eq('instructor_id', instructorProfileId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as InstructorAvailability[]
}

/** Owner-only (RLS availability_write_owner). */
export async function addAvailability(input: {
  instructor_id: string
  day_of_week: number
  start_time: string
  end_time: string
}): Promise<InstructorAvailability> {
  const { data, error } = await supabase
    .from('instructor_availability')
    .insert({ ...input, is_available: true })
    .select('*')
    .single()
  if (error) throw error
  return data as InstructorAvailability
}

export async function removeAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from('instructor_availability')
    .delete()
    .eq('id', id)
  if (error) throw error
}
