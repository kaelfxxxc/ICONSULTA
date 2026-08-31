import { createClient, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Role, SignInInput, SignUpInput } from '../types'

// A session-less client used ONLY for sign-up. Email confirmation is bypassed
// and new users are routed to the Sign In screen to log in with the credentials
// they just created — so creating an account must NOT auto-log-in the browser.
// Keeping the new session off the main `supabase` client means no persisted
// session, no onAuthStateChange event, and therefore no auto-redirect.
const signupClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// GoTrue's raw messages are terse and sometimes point at project configuration
// rather than anything the person at the keyboard did wrong ("email rate limit
// exceeded" means the project's mail quota is full, not that they mistyped).
// Translate the codes we can actually hit into something actionable.
const AUTH_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit:
    "This project's sign-up email quota is full (Supabase's built-in mailer sends only a couple of messages an hour). Turn off Authentication → Sign In / Providers → Email → “Confirm email” in the Supabase dashboard, or wait an hour and try again.",
  over_request_rate_limit: 'Too many attempts. Wait a moment and try again.',
  user_already_exists:
    'An account with that email already exists. Sign in instead.',
  email_exists: 'An account with that email already exists. Sign in instead.',
  weak_password: 'That password is too weak. Use at least 6 characters.',
  email_address_invalid: 'That email address is not valid.',
  signup_disabled: 'Sign-ups are currently disabled for this project.',
  email_not_confirmed:
    'This account has not confirmed its email yet. Open the confirmation link we sent, then sign in.',
  invalid_credentials: 'Incorrect email or password.',
  validation_failed: 'Please fill in every field with a valid value.',
}

/** Re-throw a Supabase auth error with a message worth showing a user. */
export function authError(error: unknown): Error {
  if (!(error instanceof AuthError)) {
    return error instanceof Error ? error : new Error('Something went wrong.')
  }
  const friendly =
    (error.code && AUTH_MESSAGES[error.code]) ??
    // Older GoTrue builds omit `code`; fall back to matching the message.
    (/email rate limit/i.test(error.message)
      ? AUTH_MESSAGES.over_email_send_rate_limit
      : undefined)
  return new Error(friendly ?? error.message)
}

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw authError(error)

  // Resolve the account's real role so the caller can route straight to the
  // right dashboard. The Sign In form has no role picker (and must not trust
  // one) — an admin signing in should land on /admin, not bounce via /student.
  let role: Role | null = null
  if (data.user) {
    const { data: row } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()
    role = (row as { role: Role } | null)?.role ?? null

    // Best-effort last_login stamp (RLS: users_update_self).
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)
  }

  return { ...data, role }
}

export async function signUp({
  email,
  password,
  name,
  role,
  department,
}: SignUpInput) {
  const { data, error } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user() DB trigger to create the profile rows.
      data: { name, role, ...(department ? { department } : {}) },
    },
  })
  if (error) throw authError(error)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw authError(error)
}

/** Password-reset mail goes through the same (rate-limited) project mailer. */
export async function sendPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  if (error) throw authError(error)
}
