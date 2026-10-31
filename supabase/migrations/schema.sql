create extension if not exists pgcrypto;

-- 1. users — public profile extending auth.users -------------------------------
create table if not exists public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               varchar(255) unique not null,
  name                varchar(255) not null,
  role                text not null check (role in ('student','instructor','admin')),
  status              text not null default 'active' check (status in ('active','inactive','suspended')),
  phone               varchar(20),
  profile_picture_url varchar(500),
  last_login          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 2. student_profiles ----------------------------------------------------------
create table if not exists public.student_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.users(id) on delete cascade,
  student_id      varchar(50),
  department      text check (department in ('SOB','SOT','SOE')),
  year_level      varchar(20),
  major           varchar(100),
  enrollment_date date,
  status          text default 'active' check (status in ('active','inactive','graduated')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3. instructor_profiles -------------------------------------------------------
create table if not exists public.instructor_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.users(id) on delete cascade,
  department          text check (department in ('SOB','SOT','SOE')),
  category            varchar(100),
  office_location     varchar(255),
  bio                 text,
  specializations     varchar(255),
  years_of_experience int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 4. admin_users ---------------------------------------------------------------
create table if not exists public.admin_users (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users(id) on delete cascade,
  permissions jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- 5. instructor_availability ---------------------------------------------------
create table if not exists public.instructor_availability (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructor_profiles(id) on delete cascade,
  day_of_week   int not null check (day_of_week between 1 and 7),
  start_time    time not null,
  end_time      time not null,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_time > start_time)
);

-- 6. appointments --------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.student_profiles(id) on delete cascade,
  instructor_id    uuid not null references public.instructor_profiles(id) on delete cascade,
  scheduled_at     timestamptz not null,
  reason           varchar(255),
  status           text not null default 'pending' check (status in ('pending','approved','rejected','completed','cancelled')),
  mode             text not null default 'online' check (mode in ('online')),
  video_room_id    varchar(100),
  rejection_reason text,
  instructor_notes text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 7. video_sessions ------------------------------------------------------------
create table if not exists public.video_sessions (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references public.appointments(id) on delete cascade,
  room_id           varchar(100),
  start_time        timestamptz,
  end_time          timestamptz,
  duration          int,               -- minutes
  participant_count int,
  created_at        timestamptz not null default now()
);

-- 8. appointment_summaries -----------------------------------------------------
create table if not exists public.appointment_summaries (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null unique references public.appointments(id) on delete cascade,
  transcript        text,
  summary           text,
  resolution_status text default 'ongoing' check (resolution_status in ('resolved','unresolved','ongoing')),
  generated_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 9. notifications -------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  type           text check (type in ('appointment','reminder','status','system')),
  title          varchar(255),
  content        text,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- 10. analytics_metrics --------------------------------------------------------
create table if not exists public.analytics_metrics (
  id                        uuid primary key default gen_random_uuid(),
  date                      date not null unique,
  total_appointments        int default 0,
  approved_appointments     int default 0,
  pending_appointments      int default 0,
  rejected_appointments     int default 0,
  completed_appointments    int default 0,
  student_activity_count    int default 0,
  instructor_activity_count int default 0,
  avg_session_duration      decimal(5,2),
  created_at                timestamptz not null default now()
);
