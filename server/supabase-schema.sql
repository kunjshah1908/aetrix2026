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
