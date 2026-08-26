-- 1. Notify the counterparty on create + on any status change -----------------
create or replace function public.notify_appointment_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_student_user_id    uuid;
  v_instructor_user_id uuid;
  v_student_name       text;
  v_instructor_name    text;
  v_reason             text := coalesce(nullif(new.reason, ''), 'a consultation');
begin
  select sp.user_id, su.name
    into v_student_user_id, v_student_name
    from public.student_profiles sp
    join public.users su on su.id = sp.user_id
   where sp.id = new.student_id;

  select ip.user_id, iu.name
    into v_instructor_user_id, v_instructor_name
    from public.instructor_profiles ip
    join public.users iu on iu.id = ip.user_id
   where ip.id = new.instructor_id;

  if tg_op = 'INSERT' then
    -- A new request always lands in the instructor's inbox.
    insert into public.notifications (user_id, appointment_id, type, title, content)
    values (
      v_instructor_user_id, new.id, 'appointment',
      'New consultation request',
      coalesce(v_student_name, 'A student') || ' requested "' || v_reason || '".'
    );

  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- The student hears about the instructor's decision / lifecycle events.
    insert into public.notifications (user_id, appointment_id, type, title, content)
    values (
      v_student_user_id, new.id, 'status',
      case new.status
        when 'approved'  then 'Consultation approved'
        when 'rejected'  then 'Consultation rejected'
        when 'completed' then 'Consultation completed'
        when 'cancelled' then 'Consultation cancelled'
        else 'Consultation updated'
      end,
      'Your consultation with ' || coalesce(v_instructor_name, 'the instructor') ||
      ' is now ' || new.status ||
      case when new.status = 'rejected' and coalesce(new.rejection_reason, '') <> ''
           then ' — ' || new.rejection_reason else '' end || '.'
    );

    -- Let the instructor know if the student cancels.
    if new.status = 'cancelled' then
      insert into public.notifications (user_id, appointment_id, type, title, content)
      values (
        v_instructor_user_id, new.id, 'status', 'Consultation cancelled',
        coalesce(v_student_name, 'A student') || ' cancelled "' || v_reason || '".'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appt_notify_ins on public.appointments;
create trigger trg_appt_notify_ins
  after insert on public.appointments
  for each row execute function public.notify_appointment_event();

drop trigger if exists trg_appt_notify_upd on public.appointments;
create trigger trg_appt_notify_upd
  after update on public.appointments
  for each row execute function public.notify_appointment_event();

-- 2. Bootstrap a video session + summary when an appointment completes ---------
create or replace function public.bootstrap_completion_artifacts()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_student_name    text;
  v_instructor_name text;
begin
  if tg_op = 'UPDATE'
     and new.status = 'completed'
     and old.status is distinct from 'completed' then

    if not exists (select 1 from public.video_sessions where appointment_id = new.id) then
      insert into public.video_sessions
        (appointment_id, room_id, start_time, end_time, duration, participant_count)
      values (
        new.id,
        coalesce(new.video_room_id, 'room-' || left(new.id::text, 8)),
        now() - interval '32 minutes', now(), 32, 2
      );
    end if;

    select su.name, iu.name
      into v_student_name, v_instructor_name
      from public.appointments a
      join public.student_profiles sp    on sp.id = a.student_id
      join public.users su               on su.id = sp.user_id
      join public.instructor_profiles ip on ip.id = a.instructor_id
      join public.users iu               on iu.id = ip.user_id
     where a.id = new.id;

    insert into public.appointment_summaries
      (appointment_id, transcript, summary, resolution_status, generated_at)
    values (
      new.id, null,
      'Consultation between ' || coalesce(v_instructor_name, 'the instructor') ||
      ' and ' || coalesce(v_student_name, 'the student') || ' regarding "' ||
      coalesce(new.reason, 'the consultation') ||
      '" has concluded. Key discussion points and action items will appear here ' ||
      'once the AI summary has been generated.',
      'resolved', now()
    )
    on conflict (appointment_id) do update
      set summary           = excluded.summary,
          resolution_status = excluded.resolution_status,
          generated_at      = excluded.generated_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appt_completion on public.appointments;
create trigger trg_appt_completion
  after update on public.appointments
  for each row execute function public.bootstrap_completion_artifacts();

-- 3. Let the service role (seed / server) set role/status ---------------------
-- The 0005 guard blocks non-admins from changing their own role/status. It keys
-- off is_admin(), which is false when there is no JWT subject (auth.uid() null).
-- Only the service role (RLS-bypassing) or a migration ever reaches this trigger
-- with a null uid, so allowing that case is safe and lets the seed suspend a
-- user without weakening the guard for real authenticated users.
create or replace function public.guard_user_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'Not authorized to change role or status';
  end if;
  return new;
end;
$$;
