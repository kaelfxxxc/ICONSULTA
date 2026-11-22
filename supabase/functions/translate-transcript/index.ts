const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'Translation service is not configured' }, 503)

  let text: string
  let language: string
  try {
    const body = await req.json()
    text = typeof body?.text === 'string' ? body.text.trim() : ''
    language = body?.language
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!text || !['English', 'Tagalog', 'Cebuano'].includes(language)) {
    return json({ error: 'text and a supported language are required' }, 400)
  }
  if (language === 'English') return json({ text })

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text:
          `Translate the following spoken sentence into ${language}. Return only the translation. ` +
          `Do not add, remove, summarize, or invent anything. Preserve names and meaning. ` +
          `If it is already in ${language}, return it unchanged.\n\n${text}`,
        }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 300 },
      }),
    })
    if (!response.ok) return json({ error: 'Translation failed' }, 502)
    const output = await response.json()
    const translated = output?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '').join(' ').trim()
    return translated ? json({ text: translated }) : json({ error: 'Translation returned no text' }, 502)
  } catch {
    return json({ error: 'Translation failed' }, 502)
  }
})
