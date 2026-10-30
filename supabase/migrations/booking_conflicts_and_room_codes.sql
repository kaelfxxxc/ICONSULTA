-- Busy hours can be checked without exposing appointment parties to students.
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
    and a.status in ('pending', 'approved')
    and a.scheduled_at < (target_date + 1)::timestamptz
    and a.scheduled_at >= target_date::timestamptz;
$$;
revoke all on function public.instructor_busy_slots(uuid, date) from public;
grant execute on function public.instructor_busy_slots(uuid, date) to authenticated;

-- Serialize bookings per instructor and hour. Pending requests reserve a slot;
-- rejected, cancelled, and completed appointments don't block future bookings.
-- Existing data may already contain duplicate requests. Preserve the earliest
-- active record per instructor/time and cancel the remaining duplicates before
-- adding the unique index. Later rows remain in appointment history.
with ranked_active as (
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
    rejection_reason = coalesce(a.rejection_reason, 'Cancelled because this time slot was already reserved.')
from ranked_active r
where a.id = r.id and r.slot_rank > 1;

create unique index if not exists appointments_active_instructor_hour
  on public.appointments (instructor_id, scheduled_at)
  where status in ('pending', 'approved');

create or replace function public.guard_appointment_slot()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status in ('pending', 'approved') and exists (
    select 1 from public.appointments a
    where a.instructor_id = new.instructor_id
      and a.scheduled_at = new.scheduled_at
      and a.status in ('pending', 'approved')
      and a.id is distinct from new.id
  ) then
    raise exception 'This time slot is already booked.' using errcode = '23505';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_appointment_slot_guard on public.appointments;
create trigger trg_appointment_slot_guard
  before insert or update of instructor_id, scheduled_at, status on public.appointments
  for each row execute function public.guard_appointment_slot();

-- Give every approved appointment a short code that can be shared with other
-- authenticated students to join the same consultation room.
alter table public.appointments add column if not exists call_code text;
update public.appointments
set call_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where status = 'approved' and call_code is null;
create unique index if not exists appointments_call_code_unique
  on public.appointments (call_code) where call_code is not null;

-- Keep group-call access scoped to users who actually entered a valid code.
create table if not exists public.call_participants (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (appointment_id, user_id)
);
alter table public.call_participants enable row level security;
revoke all on public.call_participants from anon, authenticated;

drop policy if exists appt_select on public.appointments;
create policy appt_select on public.appointments for select using (
  student_id = public.current_student_profile_id()
  or instructor_id = public.current_instructor_profile_id()
  or public.is_admin()
  or exists (
    select 1 from public.call_participants cp
    where cp.appointment_id = appointments.id and cp.user_id = auth.uid()
  )
);

create or replace function public.can_access_appointment(appt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.appointments a
    where a.id = appt
      and (a.student_id = public.current_student_profile_id()
        or a.instructor_id = public.current_instructor_profile_id())
  ) or exists (
    select 1 from public.call_participants cp
    where cp.appointment_id = appt and cp.user_id = auth.uid()
  );
$$;
create or replace function public.shares_appointment(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appointments a
    where public.can_access_appointment(a.id)
      and (
        exists (select 1 from public.student_profiles sp where sp.id = a.student_id and sp.user_id = target_user_id)
        or exists (select 1 from public.instructor_profiles ip where ip.id = a.instructor_id and ip.user_id = target_user_id)
        or exists (
          select 1 from public.call_participants cp
          where cp.appointment_id = a.id and cp.user_id = target_user_id
        )
      )
  );
$$;

-- Replace the scalar/previous table form and grant room membership only after
-- the exact code resolves to an approved appointment.
drop function if exists public.appointment_id_for_call_code(text);
create function public.appointment_id_for_call_code(code text)
returns table(appointment_id uuid)
language plpgsql security definer set search_path = public as $$
declare matched_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;
  select a.id into matched_id
  from public.appointments a
  where regexp_replace(upper(coalesce(a.call_code, '')), '[^A-Z0-9]', '', 'g') =
        regexp_replace(upper(coalesce(code, '')), '[^A-Z0-9]', '', 'g')
    and a.status = 'approved'
  limit 1;
  if matched_id is not null then
    insert into public.call_participants (appointment_id, user_id)
    values (matched_id, auth.uid())
    on conflict (appointment_id, user_id) do nothing;
    return query select matched_id;
  end if;
end;
$$;
revoke all on function public.appointment_id_for_call_code(text) from public;
grant execute on function public.appointment_id_for_call_code(text) to authenticated;

create or replace function public.my_joined_call_rooms()
returns table(
  appointment_id uuid,
  call_code text,
  reason varchar,
  scheduled_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, a.call_code, a.reason, a.scheduled_at
  from public.call_participants cp
  join public.appointments a on a.id = cp.appointment_id
  where cp.user_id = auth.uid() and a.status = 'approved'
  order by a.scheduled_at desc;
$$;
revoke all on function public.my_joined_call_rooms() from public;
grant execute on function public.my_joined_call_rooms() to authenticated;

create or replace function public.assign_appointment_call_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'approved' and new.call_code is null then
    new.call_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_appointment_call_code on public.appointments;
create trigger trg_appointment_call_code
  before insert or update of status on public.appointments
  for each row execute function public.assign_appointment_call_code();

-- Safe to rerun after the initial migration: replace earlier definitions that
-- depended on pgcrypto's gen_random_bytes function.
create or replace function public.assign_appointment_call_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'approved' and new.call_code is null then
    new.call_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;
