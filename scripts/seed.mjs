// ICONSULTA seed — reproduces the screenshot data against a live Supabase project.
//
// Requires the SERVICE ROLE key (bypasses RLS, can create auth users). Never put
// this key in the client bundle / .env.local. Run:
//
//   export SUPABASE_URL="https://<ref>.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<service_role key from dashboard>"
//   npm run seed
//
// Safe to re-run: it deletes any previously-seeded auth users first (cascades
// through public.users -> profiles -> appointments -> summaries/notifications).

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

const PASSWORD = 'Consulta123!'

// ---- People ----------------------------------------------------------------
// role/name/department flow into user_metadata, which handle_new_user() reads
// to create the public.users row + the matching profile row.
const INSTRUCTORS = [
  {
    email: 'sarah.jenkins@mcce.edu.ph',
    name: 'Dr. Sarah Jenkins',
    department: 'SOT',
    category: 'Computer Science',
    office: 'Tech Bldg, Rm 402',
    bio: 'Thesis advising, algorithms, and undergraduate research.',
    specializations: 'Algorithms, Machine Learning, Thesis Advising',
    years: 11,
    phone: '+63 917 100 2001',
  },
  {
    email: 'alice.wong@mcce.edu.ph',
    name: 'Dr. Alice Wong',
    department: 'SOT',
    category: 'Data Science',
    office: 'Tech Bldg, Rm 210',
    bio: 'Data engineering and applied statistics.',
    specializations: 'Data Science, Statistics, Python',
    years: 8,
    phone: '+63 917 100 2002',
  },
  {
    email: 'robert.chen@mcce.edu.ph',
    name: 'Prof. Robert Chen',
    department: 'SOB',
    category: 'Finance',
    office: 'Business Bldg, Rm 118',
    bio: 'Corporate finance and investment analysis.',
    specializations: 'Finance, Accounting, Economics',
    years: 14,
    phone: '+63 917 100 2003',
  },
  {
    email: 'sarah.kline@mcce.edu.ph',
    name: 'Dr. Sarah Kline',
    department: 'SOE',
    category: 'Curriculum & Instruction',
    office: 'Education Bldg, Rm 305',
    bio: 'Curriculum design and assessment.',
    specializations: 'Curriculum, Pedagogy, Assessment',
    years: 9,
    phone: '+63 917 100 2004',
  },
  {
    email: 'elena.rostova@mcce.edu.ph',
    name: 'Dr. Elena Rostova',
    department: 'SOE',
    category: 'Educational Psychology',
    office: 'Education Bldg, Rm 214',
    bio: 'Learning sciences and thesis advising.',
    specializations: 'Educational Psychology, Research Methods',
    years: 12,
    phone: '+63 917 100 2005',
  },
  {
    email: 'marcus.jenkins@mcce.edu.ph',
    name: 'Prof. Marcus Jenkins',
    department: 'SOB',
    category: 'Marketing',
    office: 'Business Bldg, Rm 240',
    bio: 'Brand strategy and consumer behavior.',
    specializations: 'Marketing, Strategy, Analytics',
    years: 7,
    phone: '+63 917 100 2006',
  },
  {
    email: 'maria.torres@mcce.edu.ph',
    name: 'Prof. Maria Torres',
    department: 'SOT',
    category: 'Software Engineering',
    office: 'Tech Bldg, Rm 118',
    bio: 'Software architecture and web systems.',
    specializations: 'Software Engineering, Web, Databases',
    years: 10,
    phone: '+63 917 100 2007',
  },
]

const STUDENTS = [
  {
    email: 'alex.mercer@mcce.edu.ph',
    name: 'Alex Mercer',
    department: 'SOT',
    student_id: '2022-00417',
    year_level: '4th Year',
    major: 'Computer Science',
    phone: '+63 917 200 3001',
  },
  {
    email: 'michael.chang@mcce.edu.ph',
    name: 'Michael Chang',
    department: 'SOT',
    student_id: '2022-00512',
    year_level: '4th Year',
    major: 'Computer Science',
    phone: '+63 917 200 3002',
  },
  {
    email: 'emma.wilson@mcce.edu.ph',
    name: 'Emma Wilson',
    department: 'SOT',
    student_id: '2023-00988',
    year_level: '2nd Year',
    major: 'Information Technology',
    phone: '+63 917 200 3003',
  },
  {
    email: 'david.kim@mcce.edu.ph',
    name: 'David Kim',
    department: 'SOB',
    student_id: '2021-00133',
    year_level: '4th Year',
    major: 'Business Administration',
    phone: '+63 917 200 3004',
    status: 'suspended', // demonstrates the admin "Suspended" row
  },
]

const ADMINS = [
  { email: 'alex.kumar@mcce.edu.ph', name: 'Alex Kumar', phone: '+63 917 000 9001' },
]

const ALL_EMAILS = [...INSTRUCTORS, ...STUDENTS, ...ADMINS].map((u) => u.email)

// ---- Helpers ----------------------------------------------------------------
function isoAt(daysFromToday, hours, minutes) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

async function wipeExistingSeedUsers() {
  const byEmail = new Map()
  let page = 1
  // Page through auth users; a fresh project has few.
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    for (const u of data.users) byEmail.set(u.email, u.id)
    if (data.users.length < 200) break
    page += 1
  }
  for (const email of ALL_EMAILS) {
    const id = byEmail.get(email)
    if (id) {
      const { error } = await db.auth.admin.deleteUser(id)
      if (error) throw error
    }
  }
}

async function createAuthUser({ email, name, role, department }) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name, role, ...(department ? { department } : {}) },
  })
  if (error) throw error
  return data.user.id
}

async function profileIdFor(table, userId) {
  const { data, error } = await db.from(table).select('id').eq('user_id', userId).single()
  if (error) throw error
  return data.id
}

// availability rows for one instructor: [day_of_week, [ [start,end], ... ]]
async function seedAvailability(instructorProfileId, week) {
  const rows = []
  for (const [day, slots] of week) {
    for (const [start_time, end_time] of slots) {
      rows.push({ instructor_id: instructorProfileId, day_of_week: day, start_time, end_time, is_available: true })
    }
  }
  if (rows.length) {
    const { error } = await db.from('instructor_availability').insert(rows)
    if (error) throw error
  }
}

const AM = ['09:00:00', '12:00:00']
const PM = ['13:00:00', '16:00:00']

async function createAppointment({ studentId, instructorId, scheduled_at, reason, video_room_id }) {
  const { data, error } = await db
    .from('appointments')
    .insert({ student_id: studentId, instructor_id: instructorId, scheduled_at, reason, status: 'pending', video_room_id: video_room_id ?? null })
    .select('id')
    .single()
  if (error) throw error
  return data.id // INSERT fires notify trigger -> instructor inbox
}

async function setStatus(appointmentId, status, extra = {}) {
  const { error } = await db.from('appointments').update({ status, ...extra }).eq('id', appointmentId)
  if (error) throw error // UPDATE fires notify + (on 'completed') bootstrap triggers
}

async function setSummary(appointmentId, summary) {
  const { error } = await db
    .from('appointment_summaries')
    .update({ summary, resolution_status: 'resolved', generated_at: new Date().toISOString() })
    .eq('appointment_id', appointmentId)
  if (error) throw error
}

// ---- Run --------------------------------------------------------------------
async function main() {
  console.log('› Clearing any previously seeded users…')
  await wipeExistingSeedUsers()

  console.log('› Creating users (auth + profiles via trigger)…')
  const instructorIds = {} // email -> instructor_profiles.id
  const userIds = {} // email -> users.id

  for (const it of INSTRUCTORS) {
    const uid = await createAuthUser({ email: it.email, name: it.name, role: 'instructor', department: it.department })
    userIds[it.email] = uid
    const pid = await profileIdFor('instructor_profiles', uid)
    instructorIds[it.email] = pid
    await db.from('instructor_profiles').update({
      category: it.category, office_location: it.office, bio: it.bio,
      specializations: it.specializations, years_of_experience: it.years,
    }).eq('id', pid)
    await db.from('users').update({ phone: it.phone, last_login: isoAt(0, 8, 30) }).eq('id', uid)
  }

  const studentIds = {} // email -> student_profiles.id
  for (const st of STUDENTS) {
    const uid = await createAuthUser({ email: st.email, name: st.name, role: 'student', department: st.department })
    userIds[st.email] = uid
    const pid = await profileIdFor('student_profiles', uid)
    studentIds[st.email] = pid
    await db.from('student_profiles').update({
      student_id: st.student_id, year_level: st.year_level, major: st.major,
    }).eq('id', pid)
    await db.from('users').update({
      phone: st.phone, last_login: isoAt(-1, 14, 5),
      ...(st.status ? { status: st.status } : {}),
    }).eq('id', uid)
  }

  for (const ad of ADMINS) {
    const uid = await createAuthUser({ email: ad.email, name: ad.name, role: 'admin' })
    userIds[ad.email] = uid
    await db.from('users').update({ phone: ad.phone, last_login: isoAt(0, 7, 45) }).eq('id', uid)
  }

  console.log('› Seeding availability…')
  await seedAvailability(instructorIds['sarah.jenkins@mcce.edu.ph'], [
    [1, [AM, PM]], [2, [AM]], [3, [AM, PM]], [4, [PM]], [5, [AM]],
  ])
  await seedAvailability(instructorIds['elena.rostova@mcce.edu.ph'], [
    [1, [PM]], [2, [AM, PM]], [3, [PM]], [4, [AM]], [5, [AM, PM]],
  ])
  await seedAvailability(instructorIds['alice.wong@mcce.edu.ph'], [
    [1, [AM]], [3, [AM, PM]], [5, [PM]],
  ])
  await seedAvailability(instructorIds['marcus.jenkins@mcce.edu.ph'], [
    [2, [AM, PM]], [4, [AM, PM]],
  ])
  await seedAvailability(instructorIds['robert.chen@mcce.edu.ph'], [[1, [AM]], [3, [AM]], [5, [AM]]])
  await seedAvailability(instructorIds['maria.torres@mcce.edu.ph'], [[2, [PM]], [4, [PM]]])

  console.log('› Seeding appointments (drives notify + summary triggers)…')
  const sarah = instructorIds['sarah.jenkins@mcce.edu.ph']

  // Instructor "Upcoming": approved, today 10:30, with Michael Chang.
  const a1 = await createAppointment({
    studentId: studentIds['michael.chang@mcce.edu.ph'], instructorId: sarah,
    scheduled_at: isoAt(0, 10, 30), reason: 'Thesis Proposal Review', video_room_id: 'room-thesis-01',
  })
  await setStatus(a1, 'approved')

  // Instructor "Requests": 3 pending to Dr. Sarah Jenkins.
  await createAppointment({ studentId: studentIds['emma.wilson@mcce.edu.ph'], instructorId: sarah, scheduled_at: isoAt(1, 9, 30), reason: 'Course Registration Help — CS101' })
  await createAppointment({ studentId: studentIds['michael.chang@mcce.edu.ph'], instructorId: sarah, scheduled_at: isoAt(2, 11, 0), reason: 'Extra Credit Opportunity' })
  await createAppointment({ studentId: studentIds['david.kim@mcce.edu.ph'], instructorId: sarah, scheduled_at: isoAt(2, 13, 30), reason: 'Lab Equipment Access' })

  // Student (Alex Mercer) "Upcoming": approved today 2:00 w/ Elena Rostova.
  const a5 = await createAppointment({
    studentId: studentIds['alex.mercer@mcce.edu.ph'], instructorId: instructorIds['elena.rostova@mcce.edu.ph'],
    scheduled_at: isoAt(0, 14, 0), reason: 'Thesis Advising', video_room_id: 'room-advising-01',
  })
  await setStatus(a5, 'approved')

  // Student pending: tomorrow 10:30 w/ Marcus Jenkins.
  await createAppointment({
    studentId: studentIds['alex.mercer@mcce.edu.ph'], instructorId: instructorIds['marcus.jenkins@mcce.edu.ph'],
    scheduled_at: isoAt(1, 10, 30), reason: 'Course Counseling',
  })

  // Completed w/ summaries (instructor Recent Logs + student Recent Activity).
  const a7 = await createAppointment({
    studentId: studentIds['david.kim@mcce.edu.ph'], instructorId: sarah,
    scheduled_at: isoAt(-14, 15, 0), reason: 'Midterm Review Session', video_room_id: 'room-midterm-01',
  })
  await setStatus(a7, 'completed')
  await setSummary(
    a7,
    'Reviewed midterm performance and clarified recursion and Big-O analysis. ' +
      'Action items: David to redo problem set 3 and submit by Friday; schedule a ' +
      'follow-up before finals. Resolution: student left with a clear study plan.',
  )

  const a8 = await createAppointment({
    studentId: studentIds['alex.mercer@mcce.edu.ph'], instructorId: instructorIds['alice.wong@mcce.edu.ph'],
    scheduled_at: isoAt(-6, 11, 0), reason: 'Project Proposal Check', video_room_id: 'room-proposal-01',
  })
  await setStatus(a8, 'completed')
  await setSummary(
    a8,
    'Discussed the data-pipeline project scope. Narrowed the dataset, agreed on ' +
      'evaluation metrics, and set milestones. Action items: Alex to submit a ' +
      'one-page proposal and share a repo link. Resolution: proposal approved to proceed.',
  )

  console.log('› Seeding analytics for the current month…')
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-based
  const daysSoFar = now.getDate()
  const TOTAL = 1432
  const COMPLETED = 1358 // 1358 / 1432 = 94.8%
  const baseT = Math.floor(TOTAL / daysSoFar)
  const baseC = Math.floor(COMPLETED / daysSoFar)
  let remT = TOTAL - baseT * daysSoFar
  let remC = COMPLETED - baseC * daysSoFar
  const rows = []
  for (let d = 1; d <= daysSoFar; d++) {
    const total = baseT + (remT-- > 0 ? 1 : 0)
    let completed = baseC + (remC-- > 0 ? 1 : 0)
    if (completed > total) completed = total
    const rejected = Math.round(total * 0.02)
    const pending = Math.max(0, Math.round(total * 0.03))
    const approved = Math.max(0, total - completed - rejected - pending)
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    rows.push({
      date: `${year}-${mm}-${dd}`,
      total_appointments: total,
      approved_appointments: approved,
      pending_appointments: pending,
      rejected_appointments: rejected,
      completed_appointments: completed,
      student_activity_count: total * 2 + 5,
      instructor_activity_count: Math.round(total * 0.8),
      avg_session_duration: 32,
    })
  }
  const { error: aErr } = await db.from('analytics_metrics').upsert(rows, { onConflict: 'date' })
  if (aErr) throw aErr

  console.log('\n✓ Seed complete.\n')
  console.log('  Sign in with any of these (password for all: ' + PASSWORD + '):')
  console.log('    Instructor : sarah.jenkins@mcce.edu.ph')
  console.log('    Student    : alex.mercer@mcce.edu.ph')
  console.log('    Admin      : alex.kumar@mcce.edu.ph')
  console.log('')
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message ?? err)
  process.exit(1)
})
