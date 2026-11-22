import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-3.5-flash'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_API_KEY')
  if (!supabaseUrl || !serviceRole) return json({ error: 'Server not configured' }, 500)

  let appointmentId: string | undefined
  let language = 'English'
  try {
    const body = await req.json()
    appointmentId = body?.appointment_id ?? body?.appointmentId
    language = body?.language ?? 'English'
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!appointmentId) return json({ error: 'appointment_id is required' }, 400)

  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: userError } = await caller.auth.getUser()
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } })
  const { data: appt, error: apptError } = await admin
    .from('appointments')
    .select(`id, reason,
      student:student_profiles!inner ( user:users!inner ( id, name ) ),
      instructor:instructor_profiles!inner ( user:users!inner ( id, name ) )`)
    .eq('id', appointmentId)
    .maybeSingle()
  if (apptError) return json({ error: apptError.message }, 500)
  if (!appt) return json({ error: 'Appointment not found' }, 404)

  const studentUser = (appt as Record<string, any>).student?.user
  const instructorUser = (appt as Record<string, any>).instructor?.user
  const { data: participant } = await admin
    .from('call_participants')
    .select('user_id')
    .eq('appointment_id', appointmentId)
    .eq('user_id', user.id)
    .maybeSingle()
  const isParty = user.id === studentUser?.id || user.id === instructorUser?.id || !!participant
  if (!isParty) return json({ error: 'Forbidden' }, 403)

  const { data: existing, error: summaryError } = await admin
    .from('appointment_summaries')
    .select('transcript')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (summaryError) return json({ error: summaryError.message }, 500)

  const transcript = existing?.transcript?.trim() ?? ''
  let summary: string | null = null
  let providerFailure: string | null = null

  if (!geminiKey) {
    providerFailure = 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets'
  } else if (!transcript) {
    providerFailure = 'No transcript was captured for this session'
  } else {
    try {
      const reason = (appt as Record<string, any>).reason || 'the consultation'
      const prompt =
        `Create a concise, factual summary in ${language} using only the transcript below. ` +
        `Return 3 to 7 bullet points. Prioritize the student's main questions or concerns, ` +
        `the instructor's explanations or guidance, decisions made, unresolved issues, and agreed next steps. ` +
        `Do not invent facts, advice, decisions, or topics. If something was not said, leave it out. ` +
        `Start every point with "• ". Appointment topic: "${reason}".\n\nTranscript:\n${transcript.slice(0, 12000)}`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90_000)
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
      let response: Response | null = null

      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': geminiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 700 },
          }),
        })
        if (response.status !== 429 && response.status !== 503) break
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
      clearTimeout(timeout)

      if (response?.ok) {
        const output = await response.json()
        const text = output?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? '')
          .join('')
          .trim()
        if (text) summary = text
        else providerFailure = 'Gemini returned an empty summary'
      } else if (response) {
        let detail = ''
        try {
          const errorBody = await response.json()
          detail = typeof errorBody?.error?.message === 'string'
            ? `: ${errorBody.error.message}`
            : ''
        } catch { /* Keep the HTTP status */ }
        providerFailure = `Gemini request failed (${response.status})${detail}`
      }
    } catch (error) {
      providerFailure = error instanceof DOMException && error.name === 'AbortError'
        ? 'Gemini request timed out after 90 seconds'
        : error instanceof Error ? error.message : 'Gemini request failed'
    }
  }

  if (!summary) {
    summary = transcript
      ? `The transcript was saved, but AI summary generation failed. ${providerFailure ?? 'Please try again.'}`
      : 'No transcript was captured for this session, so a factual summary could not be generated.'
  }

  const { error: updateError } = await admin
    .from('appointment_summaries')
    .update({
      summary,
      resolution_status: 'resolved',
      generated_at: new Date().toISOString(),
    })
    .eq('appointment_id', appointmentId)
  if (updateError) return json({ error: updateError.message }, 500)

  return json({
    ok: true,
    appointment_id: appointmentId,
    source: summary && providerFailure === null ? 'gemini' : 'unavailable',
    ...(providerFailure ? { warning: providerFailure } : {}),
  })
})
