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
3. Copy [.env.example](.env.example) to .env and fill:
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
