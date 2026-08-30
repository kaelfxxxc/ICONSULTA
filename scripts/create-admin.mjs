// ICONSULTA — create a single admin auth user against a live Supabase project.
//
// The handle_new_user() auth trigger reads user_metadata.role and creates the
// matching public.users + admin_users rows automatically (see
// supabase/migrations/0004_auth_trigger.sql).
//
// Requires the SERVICE ROLE key (bypasses RLS, can create auth users). Never
// put this key in the client bundle / .env.local. Run:
//
//   export SUPABASE_URL="https://<ref>.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<service_role key from dashboard>"
//   npm run create-admin
//
// Optionally override the defaults with env vars:
//
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=Secret123! ADMIN_NAME="Site Admin" \
//     npm run create-admin

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    '\n  Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then re-run.\n' +
      '  (The service_role key is under Project Settings → API. Keep it secret.)\n',
  )
  process.exit(1)
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = process.env.ADMIN_EMAIL ?? 'admin.mcc@gmail.com'
const PASSWORD = process.env.ADMIN_PASSWORD ?? '@Dmin123'
const NAME = process.env.ADMIN_NAME ?? 'Admin'

async function main() {
  const { data, error } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME, role: 'admin' },
  })
  if (error) throw error

  const uid = data.user.id
  const { data: profile, error: profileError } = await db
    .from('users')
    .select('id, email, name, role')
    .eq('id', uid)
    .single()
  if (profileError) throw profileError

  const { data: adminRow, error: adminError } = await db
    .from('admin_users')
    .select('id')
    .eq('user_id', uid)
    .single()
  if (adminError) throw adminError

  console.log('\n✓ Admin created.\n')
  console.log('  Email    : ' + EMAIL)
  console.log('  Password : ' + PASSWORD)
  console.log('  Role     : ' + profile.role)
  console.log('  Admin row: ' + (adminRow ? 'present (admin_users)' : 'MISSING'))
  console.log('')
}

main().catch((err) => {
  console.error('\n✗ Failed:', err.message ?? err)
  process.exit(1)
})
