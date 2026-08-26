create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role       text := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student');
  v_name       text := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  v_department text := nullif(new.raw_user_meta_data->>'department', '');
begin
  if v_role not in ('student', 'instructor', 'admin') then
    v_role := 'student';
  end if;

  insert into public.users (id, email, name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do nothing;

  if v_role = 'student' then
    insert into public.student_profiles (user_id, department)
    values (new.id, v_department)
    on conflict (user_id) do nothing;
  elsif v_role = 'instructor' then
    insert into public.instructor_profiles (user_id, department)
    values (new.id, v_department)
    on conflict (user_id) do nothing;
  elsif v_role = 'admin' then
    insert into public.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
