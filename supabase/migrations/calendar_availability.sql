-- Allow instructors to publish availability for specific calendar dates.
-- Existing weekly rows remain valid during the transition.
alter table public.instructor_availability
  add column if not exists available_date date;

create index if not exists idx_availability_instructor_date
  on public.instructor_availability(instructor_id, available_date);
