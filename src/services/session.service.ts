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

/**
 * End a live session. Marking the appointment `completed` fires the 0006 trigger,
 * which bootstraps the video_sessions + appointment_summaries rows. Then we make
 * a best-effort call to the optional `generate-summary` Edge Function for real AI
 * text; if it isn't deployed (or HF_API_KEY is unset) the trigger placeholder
 * summary stands and the flow still completes.
 */
export async function endSession(appointmentId: string): Promise<void> {
  await completeAppointment(appointmentId)
  try {
    await supabase.functions.invoke('generate-summary', {
      body: { appointment_id: appointmentId },
    })
  } catch {
    // Intentionally ignored — graceful degradation without the function.
  }
}
