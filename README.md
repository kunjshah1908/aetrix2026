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
