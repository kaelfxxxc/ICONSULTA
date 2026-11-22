import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Keep this on a generally available Gemini model. The browser never receives
// the API key; it is read from Supabase Edge Function secrets only.
// Current Flash model accepted by the configured Gemini API project.
const META_MODEL = 'muse-spark-1.3'
const META_ENDPOINT = 'https://api.meta.ai/v1/chat/completions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const META_API_KEY = Deno.env.get('META_API_KEY')
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: 'Server not configured' }, 500)
  }

  // --- parse input ---------------------------------------------------------
  let appointmentId: string | undefined
  try {
    const body = await req.json()
    appointmentId = body?.appointment_id ?? body?.appointmentId
    var language = body?.language ?? 'English'
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!appointmentId) return json({ error: 'appointment_id is required' }, 400)

  // --- identify caller (verify_jwt already enforced a valid token) ----------
  const authHeader = req.headers.get('Authorization') ?? ''
  const asCaller = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
    error: userErr,
  } = await asCaller.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  // --- privileged reads/writes bypass RLS via the service role -------------
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  // Fetch the appointment + both parties' user ids/names for the auth check
  // and to give the model useful context.
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .select(
      `id, reason, status,
       student:student_profiles!inner ( user:users!inner ( id, name ) ),
       instructor:instructor_profiles!inner ( user:users!inner ( id, name ) )`,
    )
    .eq('id', appointmentId)
    .maybeSingle()
  if (apptErr) return json({ error: apptErr.message }, 500)
  if (!appt) return json({ error: 'Appointment not found' }, 404)

  const studentUser = (appt as Record<string, any>).student?.user
  const instructorUser = (appt as Record<string, any>).instructor?.user
  const { data: callParticipant } = await admin
    .from('call_participants')
    .select('user_id')
    .eq('appointment_id', appointmentId)
    .eq('user_id', user.id)
    .maybeSingle()
  const isParty =
    user.id === studentUser?.id || user.id === instructorUser?.id || !!callParticipant
  if (!isParty) return json({ error: 'Forbidden' }, 403)

  // Pull any captured transcript from the (trigger-bootstrapped) summary row.
  const { data: existing } = await admin
    .from('appointment_summaries')
    .select('transcript')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  const transcript: string | null = existing?.transcript ?? null

  // --- generate the summary text -------------------------------------------
  const reason = (appt as Record<string, any>).reason || 'the consultation'
  const withWhom = `${instructorUser?.name ?? 'the instructor'} and ${
    studentUser?.name ?? 'the student'
  }`

  let summary: string | null = null
  let generatedWithGemini = false
  let geminiFailure: string | null = null

  // Generate only from recorded speech. Never infer discussion points that
  // aren't present in the transcript.
  if (META_API_KEY && transcript?.trim()) {
    try {
      const controller = new AbortController()
      // Allow enough time for a long consultation while keeping the request
      // bounded so a stalled provider cannot run forever.
      const timeout = setTimeout(() => controller.abort(), 90_000)
      const requestBody = {
        model: META_MODEL,
        messages: [{ role: 'user', content:
            `Create a concise, factual summary in ${language} using only the transcript below. ` +
            `Return 3 to 7 bullet points, with each bullet covering one important topic from the call. ` +
            `Prioritize: the student's main questions or concerns, the instructor's explanations or guidance, ` +
            `decisions made, unresolved issues, and agreed next steps. ` +
            `Do not invent facts, advice, decisions, or topics. If something was not said, leave it out. ` +
            `Start every point with "• ". Appointment topic: "${reason}". ` +
            `Participants: ${withWhom}.\n\nTranscript:\n${transcript.slice(0, 12000)}`,
        }],
        temperature: 0.1,
        max_tokens: 450,
      }
      let res: Response | null = null
      for (let attempt = 0; attempt < 3; attempt += 1) {
        res = await fetch(META_ENDPOINT, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${META_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
        if (res.status !== 429 && res.status !== 503) break
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
      clearTimeout(timeout)
      if (res?.ok) {
        const out = await res.json()
        const text = out?.choices?.[0]?.message?.content
        if (text && typeof text === 'string') {
          summary = text.trim()
          generatedWithGemini = !!summary
        } else {
          geminiFailure = 'Gemini returned an empty summary'
        }
      } else if (res) {
        let detail = ''
        try {
          const errorBody = await res.json()
          detail = typeof errorBody?.error?.message === 'string'
            ? `: ${errorBody.error.message}`
            : ''
        } catch {
          // Keep the HTTP status when Gemini does not return JSON.
        }
        geminiFailure = `Gemini request failed (${res.status})${detail}`
      }
    } catch (error) {
      geminiFailure = error instanceof DOMException && error.name === 'AbortError'
        ? 'Gemini request timed out after 90 seconds'
        : error instanceof Error ? error.message : 'Gemini request failed'
    }
  } else if (!META_API_KEY) {
    geminiFailure = 'META_API_KEY is not configured in Supabase Edge Function secrets'
  }

  if (!summary) {
    summary = transcript?.trim()
      ? 'The transcript was saved, but Gemini could not generate the summary. Check the Gemini API key and try again.'
      : 'No transcript was captured for this session, so a factual summary could not be generated.'
  }

  // --- persist (upsert keeps this idempotent with the 0006 trigger row) -----
  const { error: upErr } = await admin
    .from('appointment_summaries')
    .update({
      summary,
      resolution_status: 'resolved',
      generated_at: new Date().toISOString(),
    })
    .eq('appointment_id', appointmentId)
  if (upErr) return json({ error: upErr.message }, 500)

  return json({
    ok: true,
    appointment_id: appointmentId,
    source: generatedWithGemini ? 'gemini' : 'unavailable',
    ...(geminiFailure ? { warning: geminiFailure } : {}),
  })
})
