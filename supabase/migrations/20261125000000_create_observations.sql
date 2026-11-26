-- FreWA Citizen Science Freshwater Monitoring Schema
-- Creates observations table, RLS policies, and observation-photos storage bucket

create extension if not exists pgcrypto;

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  site_name text not null check (char_length(trim(site_name)) > 0),
  latitude double precision not null check (latitude >= -90 and latitude <= 90),
  longitude double precision not null check (longitude >= -180 and longitude <= 180),
  sample_date date not null,
  sample_time time,
  freshwater_type text not null check (
    freshwater_type in ('River/Stream', 'Lake/Pond', 'Wetland/Marsh', 'Canal', 'Reservoir', 'Other')
  ),
  land_use text[] default '{}'::text[] check (
    land_use <@ array['Urban', 'Agricultural', 'Forest/Natural', 'Industrial', 'Recreational']::text[]
  ),
  bank_vegetation text not null check (
    bank_vegetation in ('None/Bare', 'Sparse', 'Moderate', 'Dense')
  ),
  water_surface text[] default '{}'::text[] check (
    water_surface <@ array['Clear', 'Scum/Foam', 'Oil sheen', 'Floating litter', 'Algal bloom']::text[]
  ),
  pollution_sources text[] default '{}'::text[] check (
    pollution_sources <@ array['Pipe discharge', 'Agricultural runoff', 'Urban runoff', 'Litter/Dumping', 'None visible']::text[]
  ),
  water_uses text[] default '{}'::text[] check (
    water_uses <@ array['Drinking', 'Fishing', 'Swimming/Boating', 'Irrigation', 'Livestock', 'Nature reserve', 'Other']::text[]
  ),
  water_uses_other text,
  aquatic_life text[] default '{}'::text[] check (
    aquatic_life <@ array['Fish', 'Amphibians', 'Macroinvertebrates', 'Water birds', 'None observed']::text[]
  ),
  algae_presence text not null check (
    algae_presence in ('None', 'Filaments/Strands', 'Green scum/mat', 'Brown/Diploid film')
  ),
  water_flow text not null check (
    water_flow in ('Stagnant/Still', 'Slow', 'Moderate', 'Fast/Torrential')
  ),
  water_level text not null check (
    water_level in ('Very low/Dry', 'Lower than normal', 'Normal', 'High/Bankfull', 'Flooding')
  ),
  nitrate_ppm numeric check (nitrate_ppm is null or (nitrate_ppm >= 0 and nitrate_ppm <= 100)),
  phosphate_ppm numeric check (phosphate_ppm is null or (phosphate_ppm >= 0 and phosphate_ppm <= 10)),
  secchi_depth_cm numeric check (secchi_depth_cm is null or (secchi_depth_cm >= 0 and secchi_depth_cm <= 500)),
  water_color text not null check (
    water_color in ('Clear', 'Brown/Peaty', 'Green', 'Milky/Turbid', 'Dark/Stained')
  ),
  participant_count integer not null default 1 check (participant_count >= 1),
  notes text,
  photo_url text,
  created_at timestamp with time zone not null default now()
);

create index if not exists observations_created_at_idx on public.observations (created_at desc);
create index if not exists observations_sample_date_idx on public.observations (sample_date desc);

alter table public.observations enable row level security;

drop policy if exists "Allow public anonymous SELECT on observations" on public.observations;
create policy "Allow public anonymous SELECT on observations"
  on public.observations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow public anonymous INSERT on observations" on public.observations;
create policy "Allow public anonymous INSERT on observations"
  on public.observations
  for insert
  to anon, authenticated
  with check (true);

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
