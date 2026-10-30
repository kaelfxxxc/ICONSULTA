-- Role of the current auth user (null if no profile row yet).
create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin')
$$;

-- The current user's student_profiles.id (null if not a student).
create or replace function public.current_student_profile_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.student_profiles where user_id = auth.uid()
$$;

-- The current user's instructor_profiles.id (null if not an instructor).
create or replace function public.current_instructor_profile_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.instructor_profiles where user_id = auth.uid()
$$;

-- True when the current user is a party (student or instructor) to `appt`,
-- or an admin. Used by video_sessions / appointment_summaries policies.
create or replace function public.can_access_appointment(appt uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.appointments a
    where a.id = appt
      and (a.student_id = public.current_student_profile_id()
        or a.instructor_id = public.current_instructor_profile_id())
  )
$$;

-- True when the current user shares an appointment with target_user_id.
-- Lets appointment counterparties read each other's `users` / profile rows
-- (e.g. an instructor sees the requesting student's name) without exposing
-- every user to everyone.
create or replace function public.shares_appointment(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    join public.student_profiles sp on sp.id = a.student_id
    join public.instructor_profiles ip on ip.id = a.instructor_id
    where (sp.user_id = auth.uid() and ip.user_id = target_user_id)
       or (ip.user_id = auth.uid() and sp.user_id = target_user_id)
  )
$$;

grant execute on function public.current_user_role()          to authenticated;
grant execute on function public.is_admin()                   to authenticated;
grant execute on function public.current_student_profile_id() to authenticated;
grant execute on function public.current_instructor_profile_id() to authenticated;
grant execute on function public.can_access_appointment(uuid) to authenticated;
grant execute on function public.shares_appointment(uuid)     to authenticated;
