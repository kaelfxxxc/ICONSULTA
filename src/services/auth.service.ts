import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { SignInInput, SignUpInput } from '../types'

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

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  // Best-effort last_login stamp (RLS: users_update_self).
  if (data.user) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)
  }
  return data
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
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
