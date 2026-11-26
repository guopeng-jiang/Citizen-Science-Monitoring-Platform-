-- Grant schema and table privileges to anon and authenticated roles for PostgREST access
grant usage on schema public to anon, authenticated;
grant select, insert on table public.observations to anon, authenticated;

-- Ensure observation-photos bucket exists and is public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'observation-photos',
  'observation-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Ensure storage policies exist for anon and authenticated
drop policy if exists "Public read access for observation photos" on storage.objects;
create policy "Public read access for observation photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'observation-photos');

drop policy if exists "Public anonymous upload for observation photos" on storage.objects;
create policy "Public anonymous upload for observation photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'observation-photos');
