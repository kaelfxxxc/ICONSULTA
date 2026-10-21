-- Slot-level booking ---------------------------------------------------------
-- Hand this file to whoever manages the Supabase project. It is the backend
-- half of the "a booked slot shows greyed out for other students" feature;
-- the frontend alone cannot read other students' appointments (appt_select).
--
-- Apply with: supabase db push   (or paste into the SQL editor)

-- 1. Read taken slots ---------------------------------------------------------
-- Returns only instants — no student ids, names or reasons. Pending requests
-- count as booked, so Student 2 cannot take Student 1's 4:00 while it is still
-- waiting for the instructor's approval.
create or replace function public.instructor_taken_slots(
  p_instructor_id uuid,
  p_from          timestamptz,
  p_to            timestamptz
)
returns setof timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select a.scheduled_at
  from public.appointments a
  where a.instructor_id = p_instructor_id
    and a.status in ('pending', 'approved')
    and a.scheduled_at >= p_from
    and a.scheduled_at <  p_to
$$;

-- Functions are executable by PUBLIC by default; keep it to signed-in users.
revoke all on function public.instructor_taken_slots(uuid, timestamptz, timestamptz) from public;
grant execute on function public.instructor_taken_slots(uuid, timestamptz, timestamptz) to authenticated;

-- 2. One booking per instructor per instant ----------------------------------
-- The real lock: two students clicking Confirm for 4:00 at the same moment
-- can't both succeed. Cancelled / rejected / completed free the slot again.
--
-- 3. One booking per student per instant -------------------------------------
-- A student can't attend two consultations at 4:00, even with different
-- instructors. Tomorrow 4:00 is a different instant, so it stays free.
--
-- If either index refuses to build, duplicates already exist — run these,
-- resolve them, then re-run:
--
--   select instructor_id, scheduled_at, count(*)
--   from public.appointments
--   where status in ('pending', 'approved')
--   group by 1, 2 having count(*) > 1;
--
--   select student_id, scheduled_at, count(*)
--   from public.appointments
--   where status in ('pending', 'approved')
--   group by 1, 2 having count(*) > 1;
create unique index if not exists one_booking_per_instructor_slot
  on public.appointments (instructor_id, scheduled_at)
  where status in ('pending', 'approved');

create unique index if not exists one_booking_per_student_slot
  on public.appointments (student_id, scheduled_at)
  where status in ('pending', 'approved');
