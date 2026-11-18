-- Pending appointments are no longer valid after their scheduled start.
create or replace function public.reject_past_pending_appointments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rejected_count integer;
begin
  update public.appointments
  set status = 'rejected',
      rejection_reason = coalesce(
        rejection_reason,
        'Automatically rejected because the appointment time had passed.'
      ),
      updated_at = now()
  where status = 'pending'
    and scheduled_at <= now();

  get diagnostics rejected_count = row_count;
  return rejected_count;
end;
$$;

revoke all on function public.reject_past_pending_appointments() from public;

create or replace function public.reject_past_appointment_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'pending' and new.scheduled_at <= now() then
    new.status := 'rejected';
    new.rejection_reason := coalesce(
      new.rejection_reason,
      'Automatically rejected because the appointment time had passed.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reject_past_appointment on public.appointments;
create trigger trg_reject_past_appointment
before insert or update of scheduled_at, status on public.appointments
for each row execute function public.reject_past_appointment_before_write();

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'reject-past-pending-appointments',
  '* * * * *',
  $$select public.reject_past_pending_appointments();$$
)
where not exists (
  select 1
  from cron.job
  where jobname = 'reject-past-pending-appointments'
);
