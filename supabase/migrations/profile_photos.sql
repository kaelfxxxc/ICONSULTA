-- Public profile photos are referenced by users.profile_picture_url.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
drop policy if exists "Users can upload their own profile photo" on storage.objects;
drop policy if exists "Users can update their own profile photo" on storage.objects;

create policy "Profile photos are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-photos');

create policy "Users can upload their own profile photo"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own profile photo"
on storage.objects for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
