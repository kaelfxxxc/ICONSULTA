-- Registration review, credential uniqueness, and auditable decisions.
alter table public.users add column if not exists approval_rejection_reason text;
alter table public.users drop constraint if exists users_status_check;
alter table public.users add constraint users_status_check check (status in ('pending','active','inactive','suspended'));
alter table public.student_profiles add column if not exists credential_id varchar(30);
alter table public.instructor_profiles add column if not exists credential_id varchar(30);
alter table public.appointments add column if not exists cancellation_reason varchar(250);
create unique index if not exists student_profiles_credential_id_uq on public.student_profiles (upper(credential_id)) where credential_id is not null;
create unique index if not exists instructor_profiles_credential_id_uq on public.instructor_profiles (upper(credential_id)) where credential_id is not null;
create table if not exists public.account_approval_audit (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  admin_user_id uuid not null references public.users(id), decision text not null check (decision in ('approved','rejected')),
  reason text, created_at timestamptz not null default now()
);
alter table public.account_approval_audit enable row level security;
create policy approval_audit_admin on public.account_approval_audit for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(nullif(new.raw_user_meta_data->>'role',''),'student'); v_name text := coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1)); v_department text := nullif(new.raw_user_meta_data->>'department',''); v_credential text := upper(nullif(new.raw_user_meta_data->>'credential_id',''));
begin
  if v_role not in ('student','instructor','admin') then v_role := 'student'; end if;
  insert into public.users(id,email,name,role,status) values(new.id,new.email,v_name,v_role,case when v_role='admin' then 'active' else 'pending' end) on conflict(id) do nothing;
  if v_role='student' then insert into public.student_profiles(user_id,department,credential_id) values(new.id,v_department,v_credential) on conflict(user_id) do update set credential_id=excluded.credential_id;
  elsif v_role='instructor' then insert into public.instructor_profiles(user_id,department,credential_id) values(new.id,v_department,v_credential) on conflict(user_id) do update set credential_id=excluded.credential_id;
  elsif v_role='admin' then insert into public.admin_users(user_id) values(new.id) on conflict(user_id) do nothing; end if;
  return new;
end; $$;

create or replace function public.notify_appointment_event() returns trigger language plpgsql security definer set search_path=public as $$
declare v_student_user_id uuid; v_instructor_user_id uuid; v_student_name text; v_instructor_name text; v_reason text := coalesce(nullif(new.reason,''),'a consultation'); v_event_reason text := coalesce(nullif(new.rejection_reason,''),nullif(new.cancellation_reason,''));
begin
 select sp.user_id,su.name into v_student_user_id,v_student_name from public.student_profiles sp join public.users su on su.id=sp.user_id where sp.id=new.student_id;
 select ip.user_id,iu.name into v_instructor_user_id,v_instructor_name from public.instructor_profiles ip join public.users iu on iu.id=ip.user_id where ip.id=new.instructor_id;
 if tg_op='INSERT' then insert into public.notifications(user_id,appointment_id,type,title,content) values(v_instructor_user_id,new.id,'appointment','New consultation request',coalesce(v_student_name,'A student')||' requested "'||v_reason||'".');
 elsif new.status is distinct from old.status then
  insert into public.notifications(user_id,appointment_id,type,title,content) values(v_student_user_id,new.id,'status','Consultation '||new.status,'Your consultation with '||coalesce(v_instructor_name,'the instructor')||' is now '||new.status||case when v_event_reason is not null then ' — Reason: '||v_event_reason else '' end||'.');
  if new.status='cancelled' then insert into public.notifications(user_id,appointment_id,type,title,content) values(v_instructor_user_id,new.id,'status','Consultation cancelled',coalesce(v_student_name,'A student')||' cancelled "'||v_reason||'". Reason: '||coalesce(new.cancellation_reason,'Not specified')||'.'); end if;
 end if; return new; end; $$;
