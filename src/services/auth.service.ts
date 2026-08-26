import { supabase } from '../lib/supabase'
import type { SignInInput, SignUpInput } from '../types'

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
  const { data, error } = await supabase.auth.signUp({
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
