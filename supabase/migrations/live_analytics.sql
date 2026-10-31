-- Live analytics for the admin dashboard ------------------------------------
-- 1. Expose analytics_metrics over realtime so charts update in place.
-- 2. Maintain the current day's row whenever appointments change, so the
--    dashboard's KPIs / trend / status donut reflect real activity instead of
--    only the seeded month-to-date series.

alter publication supabase_realtime add table public.analytics_metrics;

-- Send full rows on UPDATE so the client gets the new counts without a re-fetch
-- keyed on the primary key only.
alter table public.analytics_metrics replica identity full;

-- Recompute today's analytics_metrics row from appointments on any change.
-- Recomputing (vs. increment/decrement bookkeeping) is idempotent and
-- self-heals when an appointment is deleted.
create or replace function public.maintain_analytics_metrics()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.analytics_metrics
    (date, total_appointments, approved_appointments, pending_appointments,
     rejected_appointments, completed_appointments,
     student_activity_count, instructor_activity_count)
  select current_date,
         count(*),
         count(*) filter (where status = 'approved'),
         count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'rejected'),
         count(*) filter (where status = 'completed'),
         count(distinct student_id),
         count(distinct instructor_id)
  from public.appointments
  where scheduled_at >= current_date
    and scheduled_at < current_date + interval '1 day'
  on conflict (date) do update set
    total_appointments         = excluded.total_appointments,
    approved_appointments      = excluded.approved_appointments,
    pending_appointments       = excluded.pending_appointments,
    rejected_appointments      = excluded.rejected_appointments,
    completed_appointments     = excluded.completed_appointments,
    student_activity_count     = excluded.student_activity_count,
    instructor_activity_count  = excluded.instructor_activity_count,
    updated_at                 = now();
  return new;
end;
$$;

drop trigger if exists trg_appt_maintain_metrics on public.appointments;
create trigger trg_appt_maintain_metrics
  after insert or update or delete on public.appointments
  for each row execute function public.maintain_analytics_metrics();
