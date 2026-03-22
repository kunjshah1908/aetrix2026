# Aetrix 2026

This project uses a real backend API with Supabase PostgreSQL for user-submitted accident reports.

## Run Frontend

1. Install dependencies:

```bash
npm install --legacy-peer-deps
```

2. Start Vite frontend:

```bash
npm run dev
```

Frontend runs on http://localhost:8080.

## Run Backend API

1. Create a Supabase project.
2. Open SQL Editor and run [server/supabase-schema.sql](server/supabase-schema.sql).
	- This file now includes a safe migration for the `accident_point` column used by new reports.
3. Copy [.env.example](.env.example) to .env and fill:
	- VITE_SUPABASE_URL
	- VITE_SUPABASE_ANON_KEY
	- SUPABASE_URL
	- SUPABASE_SERVICE_ROLE_KEY
4. In another terminal run:

```bash
npm run dev:api
```

Backend runs on http://localhost:4000.

## Database

- Database: Supabase PostgreSQL
- Reports table: public.user_reports

## API Endpoints

- GET /api/health
- GET /api/reports
- POST /api/reports
- DELETE /api/reports/:id
- GET /api/orders
- POST /api/orders
- PATCH /api/orders/:id

## Regional Officer Authentication

- Route: `/regional` (login/signup)
- Protected route: `/regional/dashboard`
- Auth provider: Supabase email/password auth

### Supabase Setup Steps

1. In Supabase Dashboard, open Authentication -> Providers -> Email and enable Email provider.
2. In Authentication -> URL Configuration, add your site URLs:
	- Local: `http://localhost:8080`
	- Production: `https://<your-vercel-domain>`
3. In SQL Editor, run [server/supabase-schema.sql](server/supabase-schema.sql) to create/update:
	- `public.user_reports`
	- `public.command_orders`
	- `public.regional_officer_profiles` with RLS policies
4. In Supabase Project Settings -> API, copy:
	- Project URL -> set as `VITE_SUPABASE_URL`
	- anon public key -> set as `VITE_SUPABASE_ANON_KEY`
5. Keep backend keys private:
	- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in frontend code.

### Create First Regional Officer Account

1. Start app and open `/regional`.
2. Click `Create New Account`.
3. Enter login ID (email) and password.
4. If email confirmation is enabled, verify from inbox and then login.

## Command Center Authentication

- Route: `/dashboard` (login/signup)
- Protected route: `/dashboard/home`
- Auth provider: Supabase email/password auth

### Supabase Setup For Command Center

1. In SQL Editor, run [server/supabase-schema.sql](server/supabase-schema.sql).
2. Confirm table exists:
	- `public.command_center_profiles`
3. Ensure env values are set (local `.env` and Vercel):
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
4. Open `/dashboard` and use:
	- Login ID (email)
	- Password
	- Create New Account for first-time users

## Deploy on Vercel

The repo now includes Vercel Functions under `api/` for production API routes.

1. In Vercel project settings, add environment variables:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
2. Redeploy the project.
3. Verify health check:

```bash
https://<your-vercel-domain>/api/health
```

You should receive JSON with `"configured": true`.

### Important

- Keep `VITE_API_BASE_URL` empty when API and frontend are served by the same Vercel domain.
- If you previously committed a real Supabase service role key in any file, rotate it immediately in Supabase and update Vercel with the new key.
