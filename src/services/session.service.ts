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

export async function generateAppointmentSummary(appointmentId: string, language = 'English'): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-summary', {
    body: { appointment_id: appointmentId, language },
  })
  if (error) throw error
  if (data?.source === 'unavailable') {
    throw new Error(data.warning ?? 'Gemini could not generate the summary.')
  }
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
export async function endSession(appointmentId: string, transcript = '', language = 'English'): Promise<void> {
  try {
    await completeAppointment(appointmentId)
  } catch (error) {
    // A realtime update or a second participant may have completed the row
    // first. The transcript and summary still need to be finalized.
    if (!(error instanceof Error) || error.message !== 'This call has already ended.') throw error
  }

  const cleanedTranscript = transcript.trim()
  const { data: existingSummary, error: existingSummaryError } = await supabase
    .from('appointment_summaries')
    .select('transcript, summary')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (existingSummaryError) throw existingSummaryError

  const existingSummaryText = existingSummary?.summary?.trim() ?? ''
  const existingTranscript = existingSummary?.transcript?.trim() ?? ''
  const hasStudentSideSummary = Boolean(
    existingSummaryText &&
    !existingSummaryText.includes('once the AI summary has been generated') &&
    !existingSummaryText.includes('could not generate the summary') &&
    !existingSummaryText.includes('AI summary generation failed') &&
    !existingSummaryText.includes('No transcript was captured'),
  )

  // Keep the first party's captured transcript and completed summary canonical.
  // If the student side has already generated it, the instructor side must not
  // overwrite it with a separate browser transcript or another Gemini response.
  if (!existingTranscript && cleanedTranscript) {
    const { error } = await supabase
      .from('appointment_summaries')
      .update({ transcript: cleanedTranscript })
      .eq('appointment_id', appointmentId)
    if (error) throw error
  }

  if (!hasStudentSideSummary) {
    await generateAppointmentSummary(appointmentId, language)
  }
}
