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
-- Retain the earliest active booking for each instructor/time and student/time
-- before indexing. Keep duplicate records in history, but release their slots.
with ranked as (
  select id,
         row_number() over (
           partition by instructor_id, scheduled_at
           order by created_at asc, id asc
         ) as slot_rank
  from public.appointments
  where status in ('pending', 'approved')
)
update public.appointments a
set status = 'cancelled',
    rejection_reason = coalesce(a.rejection_reason, 'Cancelled because this instructor time was already reserved.')
from ranked r
where a.id = r.id and r.slot_rank > 1;

with ranked as (
  select id,
         row_number() over (
           partition by student_id, scheduled_at
           order by created_at asc, id asc
         ) as slot_rank
  from public.appointments
  where status in ('pending', 'approved')
)
update public.appointments a
set status = 'cancelled',
    rejection_reason = coalesce(a.rejection_reason, 'Cancelled because this student already has an appointment at that time.')
from ranked r
where a.id = r.id and r.slot_rank > 1;
create unique index if not exists one_booking_per_instructor_slot
  on public.appointments (instructor_id, scheduled_at)
  where status in ('pending', 'approved');

create unique index if not exists one_booking_per_student_slot
  on public.appointments (student_id, scheduled_at)
  where status in ('pending', 'approved');
