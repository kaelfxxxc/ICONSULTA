-- Every appointment permanently reserves its instructor/time slot.
-- Students still see their own appointment through the normal appointment
-- query, while this RPC only exposes occupied time keys to the booking view.
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
  select to_char(a.scheduled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
  from public.appointments a
  where a.instructor_id = target_instructor_id
    and (a.scheduled_at at time zone 'UTC')::date = target_date
    and a.scheduled_at < (target_date + 1)::timestamptz
    and a.scheduled_at >= target_date::timestamptz;
$$;

revoke all on function public.instructor_busy_slots(uuid, date) from public;
grant execute on function public.instructor_busy_slots(uuid, date) to authenticated;

create or replace function public.guard_appointment_slot()
returns trigger language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.instructor_id::text || new.scheduled_at::text, 0)
  );

  if exists (
    select 1
    from public.appointments a
    where a.instructor_id = new.instructor_id
      and a.scheduled_at = new.scheduled_at
      and a.id is distinct from new.id
  ) then
    raise exception 'This instructor time has already been reserved.'
      using errcode = '23505';
  end if;
  return new;
end;
$$;
