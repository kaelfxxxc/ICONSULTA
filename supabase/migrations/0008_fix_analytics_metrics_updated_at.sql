-- Fix: every write to public.appointments was failing ---------------------------
-- 0007 added an AFTER INSERT/UPDATE/DELETE trigger on appointments that upserts
-- the current day's analytics_metrics row and sets `updated_at = now()`. That
-- column was never in the 0001 schema, so the trigger always raised
--
--   column "updated_at" of relation "analytics_metrics" does not exist
--
-- and because the trigger runs in the same transaction as the appointment write,
-- the whole statement rolled back. Symptoms: "Confirm Booking" never created an
-- appointment, and an instructor could not approve / reject / complete one.
--
-- This migration adds the missing column, moves the aggregate into a callable
-- function, backfills the rows the broken trigger never wrote, and makes the
-- trigger fail soft so derived analytics can never block a booking again.

alter table public.analytics_metrics
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_analytics_metrics_updated on public.analytics_metrics;
create trigger trg_analytics_metrics_updated
  before update on public.analytics_metrics
  for each row execute function public.set_updated_at();

-- Recompute one day's metrics row from appointments. Idempotent, so it also
-- self-heals after a delete or a manual edit.
create or replace function public.recompute_analytics_metrics(p_date date)
returns void
language sql security definer set search_path = public
as $$
  insert into public.analytics_metrics
    (date, total_appointments, approved_appointments, pending_appointments,
     rejected_appointments, completed_appointments,
     student_activity_count, instructor_activity_count)
  select p_date,
         count(*),
         count(*) filter (where status = 'approved'),
         count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'rejected'),
         count(*) filter (where status = 'completed'),
         count(distinct student_id),
         count(distinct instructor_id)
  from public.appointments
  where scheduled_at >= p_date
    and scheduled_at <  p_date + interval '1 day'
  on conflict (date) do update set
    total_appointments         = excluded.total_appointments,
    approved_appointments      = excluded.approved_appointments,
    pending_appointments       = excluded.pending_appointments,
    rejected_appointments      = excluded.rejected_appointments,
    completed_appointments     = excluded.completed_appointments,
    student_activity_count     = excluded.student_activity_count,
    instructor_activity_count  = excluded.instructor_activity_count,
    updated_at                 = now();
$$;

-- Trigger wrapper. Two guards the 0007 version lacked:
--   * DELETE fires with NEW = null, so return OLD in that branch.
--   * Analytics bookkeeping is derived data — if it ever fails again it must
--     warn, not roll back the appointment the user was trying to save.
create or replace function public.maintain_analytics_metrics()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  begin
    perform public.recompute_analytics_metrics(current_date);
  exception when others then
    raise warning 'maintain_analytics_metrics skipped: % (%)', sqlerrm, sqlstate;
  end;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appt_maintain_metrics on public.appointments;
create trigger trg_appt_maintain_metrics
  after insert or update or delete on public.appointments
  for each row execute function public.maintain_analytics_metrics();

-- Backfill every day that already has appointments — the broken trigger never
-- managed to write a single row, so the admin dashboard had no live numbers.
do $$
declare d date;
begin
  for d in
    select distinct (scheduled_at at time zone 'UTC')::date
      from public.appointments
     order by 1
  loop
    perform public.recompute_analytics_metrics(d);
  end loop;
  perform public.recompute_analytics_metrics(current_date);
end $$;

grant execute on function public.recompute_analytics_metrics(date) to service_role;
