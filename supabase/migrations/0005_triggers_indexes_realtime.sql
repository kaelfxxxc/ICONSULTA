-- ============================================================================
-- ICONSULTA — 0005 triggers, guards, indexes, realtime
-- ============================================================================

-- updated_at maintenance ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_users_updated                 before update on public.users                   for each row execute function public.set_updated_at();
create trigger trg_student_profiles_updated       before update on public.student_profiles        for each row execute function public.set_updated_at();
create trigger trg_instructor_profiles_updated    before update on public.instructor_profiles     for each row execute function public.set_updated_at();
create trigger trg_availability_updated           before update on public.instructor_availability for each row execute function public.set_updated_at();
create trigger trg_appointments_updated           before update on public.appointments            for each row execute function public.set_updated_at();
create trigger trg_summaries_updated              before update on public.appointment_summaries   for each row execute function public.set_updated_at();

-- Privilege guard: non-admins cannot change their own role/status -------------
create or replace function public.guard_user_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'Not authorized to change role or status';
  end if;
  return new;
end;
$$;

create trigger trg_users_guard
  before update on public.users
  for each row execute function public.guard_user_privileges();

-- Indexes ---------------------------------------------------------------------
create index if not exists idx_student_profiles_user     on public.student_profiles(user_id);
create index if not exists idx_instructor_profiles_user  on public.instructor_profiles(user_id);
create index if not exists idx_instructor_profiles_dept  on public.instructor_profiles(department);
create index if not exists idx_availability_instructor   on public.instructor_availability(instructor_id);
create index if not exists idx_appointments_student      on public.appointments(student_id);
create index if not exists idx_appointments_instructor   on public.appointments(instructor_id);
create index if not exists idx_appointments_status       on public.appointments(status);
create index if not exists idx_appointments_scheduled    on public.appointments(scheduled_at);
create index if not exists idx_summaries_appointment     on public.appointment_summaries(appointment_id);
create index if not exists idx_video_sessions_appt       on public.video_sessions(appointment_id);
create index if not exists idx_notifications_user        on public.notifications(user_id);
create index if not exists idx_notifications_unread      on public.notifications(user_id) where is_read = false;

-- Realtime: expose the tables the UI subscribes to ----------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.appointment_summaries;
