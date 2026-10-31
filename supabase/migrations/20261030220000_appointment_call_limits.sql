-- Store one shared start timestamp so every participant sees the same
-- 60-minute call limit, including people who rejoin after disconnecting.
alter table public.appointments
  add column if not exists call_started_at timestamptz;

create or replace function public.start_appointment_call(target_appointment_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  started_at timestamptz;
begin
  if auth.uid() is null or not public.can_access_appointment(target_appointment_id) then
    raise exception 'You are not allowed to join this call.' using errcode = '42501';
  end if;

  update public.appointments a
  set call_started_at = coalesce(a.call_started_at, clock_timestamp())
  where a.id = target_appointment_id
    and a.status = 'approved'
  returning a.call_started_at into started_at;

  if started_at is null then
    raise exception 'This call is no longer active.' using errcode = 'P0002';
  end if;

  return started_at;
end;
$$;

revoke all on function public.start_appointment_call(uuid) from public;
grant execute on function public.start_appointment_call(uuid) to authenticated;
