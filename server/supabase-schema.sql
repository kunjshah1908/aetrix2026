create table if not exists public.user_reports (
  id text primary key,
  name text not null,
  phone_number text not null,
  location text not null,
  accident_point text,
  accident_type text not null,
  confirmed_severity text,
  confirmed_accident_type text,
  enrichment_details jsonb,
  description text not null,
  image_data_url text not null,
  created_at timestamptz not null default now(),
  status text not null,
  lat double precision not null,
  lng double precision not null
);

alter table public.user_reports add column if not exists accident_point text;
alter table public.user_reports add column if not exists confirmed_severity text;
alter table public.user_reports add column if not exists confirmed_accident_type text;
alter table public.user_reports add column if not exists enrichment_details jsonb;
update public.user_reports set accident_point = coalesce(accident_point, location) where accident_point is null;
alter table public.user_reports alter column accident_point set not null;

create index if not exists idx_user_reports_created_at on public.user_reports (created_at desc);

alter table public.user_reports enable row level security;

create table if not exists public.command_orders (
  id text primary key,
  timestamp text not null,
  decision_type text not null,
  incident_id text not null,
  summary text not null,
  operator text not null,
  status text not null,
  acknowledged_by text,
  acknowledged_at text,
  cancellation_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_command_orders_timestamp on public.command_orders (created_at desc);

alter table public.command_orders enable row level security;

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

create table if not exists public.command_center_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'command_center',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.command_center_profiles enable row level security;

drop policy if exists "command_center_read_own_profile" on public.command_center_profiles;
create policy "command_center_read_own_profile"
on public.command_center_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "command_center_insert_own_profile" on public.command_center_profiles;
create policy "command_center_insert_own_profile"
on public.command_center_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "command_center_update_own_profile" on public.command_center_profiles;
create policy "command_center_update_own_profile"
on public.command_center_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
