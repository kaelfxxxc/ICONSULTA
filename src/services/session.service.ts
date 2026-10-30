import { supabase } from '../lib/supabase'
import type { AppointmentSummary, ResolutionStatus, VideoSession } from '../types'
import { completeAppointment } from './appointment.service'

export async function getSummary(
  appointmentId: string,
): Promise<AppointmentSummary | null> {
  const { data, error } = await supabase
    .from('appointment_summaries')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (error) throw error
  return (data as AppointmentSummary | null) ?? null
}

export async function getVideoSession(
  appointmentId: string,
): Promise<VideoSession | null> {
  const { data, error } = await supabase
    .from('video_sessions')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (error) throw error
  return (data as VideoSession | null) ?? null
}

export async function startAppointmentCall(appointmentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_appointment_call', {
    target_appointment_id: appointmentId,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('The shared call start time was not returned.')
  return data
}

export async function generateAppointmentSummary(appointmentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('generate-summary', {
    body: { appointment_id: appointmentId },
  })
  if (error) throw error
}

export async function updateResolution(
  appointmentId: string,
  status: ResolutionStatus,
): Promise<void> {
  const { error } = await supabase
    .from('appointment_summaries')
    .update({ resolution_status: status })
    .eq('appointment_id', appointmentId)
  if (error) throw error
}

/** Complete the appointment, save its live transcript, then generate the final summary. */
export async function endSession(appointmentId: string, transcript = ''): Promise<void> {
  await completeAppointment(appointmentId)

  const cleanedTranscript = transcript.trim()
  if (cleanedTranscript) {
    const { error } = await supabase
      .from('appointment_summaries')
      .update({ transcript: cleanedTranscript })
      .eq('appointment_id', appointmentId)
    if (error) throw error
  }

  await generateAppointmentSummary(appointmentId)
}
