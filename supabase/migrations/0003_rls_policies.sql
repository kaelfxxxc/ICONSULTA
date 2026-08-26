-- ============================================================================
-- ICONSULTA — 0003 RLS policies
-- Base grants (PostgREST uses the `authenticated` role; RLS then filters rows).
-- Every table has RLS enabled. Writes that create cross-user side effects go
-- through Edge Functions using the service role, which bypasses RLS entirely.
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.users                   enable row level security;
alter table public.student_profiles        enable row level security;
alter table public.instructor_profiles     enable row level security;
alter table public.admin_users             enable row level security;
alter table public.instructor_availability enable row level security;
alter table public.appointments            enable row level security;
alter table public.video_sessions          enable row level security;
alter table public.appointment_summaries   enable row level security;
alter table public.notifications           enable row level security;
alter table public.analytics_metrics       enable row level security;

-- users -----------------------------------------------------------------------
-- Readable: self, admins, any instructor (faculty directory), and appointment
-- counterparties. A BEFORE UPDATE guard trigger (0005) blocks non-admins from
-- changing their own role/status.
create policy users_select on public.users for select using (
  id = auth.uid()
  or public.is_admin()
  or role = 'instructor'
  or public.shares_appointment(id)
);
create policy users_update_self on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy users_admin_all on public.users for all
  using (public.is_admin()) with check (public.is_admin());

-- student_profiles ------------------------------------------------------------
create policy student_profiles_select on public.student_profiles for select using (
  user_id = auth.uid() or public.is_admin() or public.shares_appointment(user_id)
);
create policy student_profiles_upsert_self on public.student_profiles for insert
  with check (user_id = auth.uid());
create policy student_profiles_update_self on public.student_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy student_profiles_admin_all on public.student_profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- instructor_profiles ---------------------------------------------------------
-- Faculty directory: any authenticated user may read instructor profiles.
create policy instructor_profiles_select on public.instructor_profiles for select
  using (true);
create policy instructor_profiles_insert_self on public.instructor_profiles for insert
  with check (user_id = auth.uid());
create policy instructor_profiles_update_self on public.instructor_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy instructor_profiles_admin_all on public.instructor_profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- admin_users -----------------------------------------------------------------
create policy admin_users_select on public.admin_users for select
  using (user_id = auth.uid() or public.is_admin());
create policy admin_users_admin_all on public.admin_users for all
  using (public.is_admin()) with check (public.is_admin());

-- instructor_availability -----------------------------------------------------
-- Students must read availability to book; only the owning instructor writes.
create policy availability_select on public.instructor_availability for select
  using (true);
create policy availability_write_owner on public.instructor_availability for all
  using (instructor_id = public.current_instructor_profile_id())
  with check (instructor_id = public.current_instructor_profile_id());
create policy availability_admin_all on public.instructor_availability for all
  using (public.is_admin()) with check (public.is_admin());

-- appointments ----------------------------------------------------------------
create policy appt_select on public.appointments for select using (
  student_id = public.current_student_profile_id()
  or instructor_id = public.current_instructor_profile_id()
  or public.is_admin()
);
create policy appt_insert_student on public.appointments for insert
  with check (student_id = public.current_student_profile_id());
create policy appt_update_instructor on public.appointments for update
  using (instructor_id = public.current_instructor_profile_id())
  with check (instructor_id = public.current_instructor_profile_id());
create policy appt_update_student on public.appointments for update
  using (student_id = public.current_student_profile_id())
  with check (student_id = public.current_student_profile_id());
create policy appt_admin_all on public.appointments for all
  using (public.is_admin()) with check (public.is_admin());

-- video_sessions --------------------------------------------------------------
create policy video_sessions_select on public.video_sessions for select
  using (public.can_access_appointment(appointment_id));
create policy video_sessions_write_party on public.video_sessions for all
  using (public.can_access_appointment(appointment_id))
  with check (public.can_access_appointment(appointment_id));

-- appointment_summaries -------------------------------------------------------
-- Readable by parties + admin; inserts happen via the generate-summary Edge
-- Function (service role). Parties may update resolution_status.
create policy summaries_select on public.appointment_summaries for select
  using (public.can_access_appointment(appointment_id));
create policy summaries_update_party on public.appointment_summaries for update
  using (public.can_access_appointment(appointment_id))
  with check (public.can_access_appointment(appointment_id));

-- notifications ---------------------------------------------------------------
-- Inserts happen server-side (Edge Functions, service role). Users read + mark
-- their own read; admins read all.
create policy notifications_select on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());
create policy notifications_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete
  using (user_id = auth.uid() or public.is_admin());

-- analytics_metrics -----------------------------------------------------------
create policy analytics_admin_all on public.analytics_metrics for all
  using (public.is_admin()) with check (public.is_admin());
