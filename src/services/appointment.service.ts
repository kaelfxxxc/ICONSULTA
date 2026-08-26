import { supabase } from '../lib/supabase'
import type { Appointment, AppointmentWithParties } from '../types'

// Embeds resolve under RLS: appointment parties may read the counterparty's
// profile + user (shares_appointment) and the summary (can_access_appointment).
const STUDENT_SELECT =
  '*, instructor:instructor_profiles(*, user:users(name,email)), summary:appointment_summaries(*)'
const INSTRUCTOR_SELECT =
  '*, student:student_profiles(*, user:users(name,email)), summary:appointment_summaries(*)'
const BOTH_SELECT =
  '*, student:student_profiles(*, user:users(name,email)), instructor:instructor_profiles(*, user:users(name,email)), summary:appointment_summaries(*)'

/** The reverse `appointment_summaries` embed may arrive as [] or {} depending on
 *  the PostgREST version; collapse it to a single object or null. */
function normalize(row: Record<string, unknown>): AppointmentWithParties {
  const raw = row.summary
  const summary = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null)
  return { ...row, summary } as AppointmentWithParties
}

export async function listStudentAppointments(
  studentProfileId: string,
): Promise<AppointmentWithParties[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(STUDENT_SELECT)
    .eq('student_id', studentProfileId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function listInstructorAppointments(
  instructorProfileId: string,
): Promise<AppointmentWithParties[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(INSTRUCTOR_SELECT)
    .eq('instructor_id', instructorProfileId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function getAppointment(
  id: string,
): Promise<AppointmentWithParties | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(BOTH_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? normalize(data) : null
}

export interface CreateAppointmentInput {
  student_id: string
  instructor_id: string
  scheduled_at: string
  reason: string
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...input, status: 'pending', mode: 'online' })
    .select('*')
    .single()
  if (error) throw error
  return data as Appointment
}

export async function approveAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'approved', video_room_id: `room-${id.slice(0, 8)}` })
    .eq('id', id)
  if (error) throw error
}

export async function rejectAppointment(
  id: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'rejected', rejection_reason: reason ?? null })
    .eq('id', id)
  if (error) throw error
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw error
}

export async function completeAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', id)
  if (error) throw error
}
