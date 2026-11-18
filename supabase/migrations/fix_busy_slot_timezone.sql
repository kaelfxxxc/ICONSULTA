-- Return real timestamptz values so the browser can compare reservations in
-- the student's local timezone. The surrounding UTC dates cover local dates
-- across timezones; the client performs the final local-date match.
create or replace function public.instructor_busy_slots(
  target_instructor_id uuid,
  target_date date
)
returns table(slot_time text)
language sql
stable
security definer
set search_path = public
as $$
  select a.scheduled_at::text
  from public.appointments a
  where a.instructor_id = target_instructor_id
    and a.status <> 'cancelled'
    and a.scheduled_at >= (target_date - 1)::timestamptz
    and a.scheduled_at < (target_date + 2)::timestamptz;
$$;

revoke all on function public.instructor_busy_slots(uuid, date) from public;
grant execute on function public.instructor_busy_slots(uuid, date) to authenticated;
