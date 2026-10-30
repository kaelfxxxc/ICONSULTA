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
set call_code = upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
where status = 'approved' and call_code is null;
create unique index if not exists appointments_call_code_unique
  on public.appointments (call_code) where call_code is not null;

create or replace function public.appointment_id_for_call_code(code text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.appointments
  where call_code = upper(trim(code)) and status = 'approved'
  limit 1;
$$;
revoke all on function public.appointment_id_for_call_code(text) from public;
grant execute on function public.appointment_id_for_call_code(text) to authenticated;

create or replace function public.assign_appointment_call_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'approved' and new.call_code is null then
    new.call_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_appointment_call_code on public.appointments;
create trigger trg_appointment_call_code
  before insert or update of status on public.appointments
  for each row execute function public.assign_appointment_call_code();

-- Add the student owning the code-matched appointment as an allowed participant
-- when looking up its appointment details.
create or replace function public.shares_appointment(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appointments a
    join public.student_profiles sp on sp.id = a.student_id
    where (a.student_id = public.current_student_profile_id()
       or a.instructor_id = public.current_instructor_profile_id()
       or public.is_admin())
      and (sp.user_id = target_user_id or exists (
        select 1 from public.appointments other
        join public.student_profiles osp on osp.id = other.student_id
        where other.call_code = a.call_code and osp.user_id = target_user_id
      ))
  );
$$;

drop policy if exists appt_select on public.appointments;
create policy appt_select on public.appointments for select using (
  student_id = public.current_student_profile_id()
  or instructor_id = public.current_instructor_profile_id()
  or public.is_admin()
  or (call_code is not null and status = 'approved' and exists (
    select 1 from public.student_profiles sp where sp.user_id = auth.uid()
  ))
);
