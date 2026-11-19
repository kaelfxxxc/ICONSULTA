-- Users who join with a valid call code must be allowed to load and enter
-- that appointment, even when they are not the original student/instructor.
create or replace function public.can_access_appointment(appt uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.appointments a
    where a.id = appt
      and (
        a.student_id = public.current_student_profile_id()
        or a.instructor_id = public.current_instructor_profile_id()
        or exists (
          select 1 from public.call_participants cp
          where cp.appointment_id = a.id and cp.user_id = auth.uid()
        )
      )
  )
$$;

grant execute on function public.can_access_appointment(uuid) to authenticated;

drop policy if exists appt_select on public.appointments;
create policy appt_select on public.appointments for select using (
  student_id = public.current_student_profile_id()
  or instructor_id = public.current_instructor_profile_id()
  or exists (
    select 1 from public.call_participants cp
    where cp.appointment_id = appointments.id and cp.user_id = auth.uid()
  )
  or public.is_admin()
);
