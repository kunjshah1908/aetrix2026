create table if not exists public.user_reports (
  id text primary key,
  name text not null,
  phone_number text not null,
  location text not null,
  accident_point text,
  accident_type text not null,
  description text not null,
  image_data_url text not null,
  created_at timestamptz not null default now(),
  status text not null,
  lat double precision not null,
  lng double precision not null
);

alter table public.user_reports add column if not exists accident_point text;
update public.user_reports set accident_point = coalesce(accident_point, location) where accident_point is null;
alter table public.user_reports alter column accident_point set not null;

create index if not exists idx_user_reports_created_at on public.user_reports (created_at desc);

alter table public.user_reports enable row level security;

-- Backend uses service role key, so policy can stay restrictive.
-- If you want to allow anon direct access later, add specific policies.

create table if not exists public.regional_officer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'regional_officer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.regional_officer_profiles enable row level security;

drop policy if exists "regional_officer_read_own_profile" on public.regional_officer_profiles;
create policy "regional_officer_read_own_profile"
on public.regional_officer_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "regional_officer_insert_own_profile" on public.regional_officer_profiles;
create policy "regional_officer_insert_own_profile"
on public.regional_officer_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "regional_officer_update_own_profile" on public.regional_officer_profiles;
create policy "regional_officer_update_own_profile"
on public.regional_officer_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
