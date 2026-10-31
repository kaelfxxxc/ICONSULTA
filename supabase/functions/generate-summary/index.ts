import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-3.8-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

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
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: 'Server not configured' }, 500)
  }

  // --- parse input ---------------------------------------------------------
  let appointmentId: string | undefined
  try {
    const body = await req.json()
    appointmentId = body?.appointment_id ?? body?.appointmentId
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

  // Generate only from recorded speech. Never infer discussion points that
  // aren't present in the transcript.
  if (GEMINI_API_KEY && transcript?.trim()) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20_000)
      const res = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text:
              `Create a concise, factual consultation summary based only on the transcript below. ` +
              `Include the student's main questions, instructor guidance, and agreed next steps when stated. ` +
              `Do not invent facts or advice. Appointment topic: "${reason}". ` +
              `Participants: ${withWhom}.\n\nTranscript:\n${transcript.slice(0, 24000)}`,
            }],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
      })
      clearTimeout(timeout)
      if (res.ok) {
        const out = await res.json()
        const text = out?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? '')
          .join(' ')
        if (text && typeof text === 'string') {
          summary = text.trim()
          generatedWithGemini = !!summary
        }
      }
    } catch {
      // fall through to the composed summary below
    }
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
  })
})
