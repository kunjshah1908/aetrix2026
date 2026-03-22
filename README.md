# Aetrix 2026

AI-powered traffic incident command platform built for hackathon speed.

## What It Is

Aetrix helps city traffic teams coordinate incidents in real time:

- Citizens submit incident reports with location + photo
- Regional officers verify and enrich reports from the field
- Command Center reviews AI suggestions and applies actions
- Orders sync to regional dashboard through real Supabase-backed APIs

This project is optimized for demo impact: fast workflows, clear operational panels, live map context, and role-based dashboards.

## Demo Value (Hackathon Pitch)

- Real workflow: citizen -> regional -> command center -> orders -> closure
- Real backend: Vercel Functions + Supabase PostgreSQL
- Role-based auth flows for regional and command center users
- Actionable AI interface with decisions and dispatch flow

## Tech Stack

- Frontend: React + TypeScript + Vite
- UI: Tailwind + custom components
- Map: Leaflet
- Backend: Vercel Serverless Functions in [api](api)
- Database/Auth: Supabase
- Testing: Vitest + Playwright setup

## Project Structure

- App source: [src](src)
- Serverless APIs: [api](api)
- SQL schema: [server/supabase-schema.sql](server/supabase-schema.sql)
- Vercel config: [vercel.json](vercel.json)

## Quick Start (Local)

1. Install dependencies

```bash
npm install --legacy-peer-deps
```

2. Configure env

Create `.env` using your Supabase values:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_API_BASE_URL=
```

3. Run database schema

Open Supabase SQL Editor and execute [server/supabase-schema.sql](server/supabase-schema.sql).

4. Start app

```bash
npm run dev
```

5. Open app

`http://localhost:8080`

## Production (Vercel)

1. Deploy this repository to one Vercel project.
2. Add environment variables in Vercel (Production + Preview):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

3. Set `VITE_API_BASE_URL`:

- Same domain API + frontend: leave it empty
- Separate API domain: set full API origin

4. Redeploy and verify:

- `https://<your-vercel-domain>/api/health` should return `configured: true`

## Core API Routes

- `GET /api/health`
- `GET /api/reports`
- `POST /api/reports`
- `PATCH /api/reports/:id`
- `DELETE /api/reports/:id`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id`

## Demo Flow (2 Minutes)

1. Submit a new incident from public/report flow.
2. Login as Regional Officer and verify + enrich incident.
3. Login as Command Center and apply decision.
4. Show order reflected in Regional "Command Center Orders".
5. Acknowledge/cancel order and show status update.

## Troubleshooting

- Orders not syncing on Vercel:
Run latest schema from [server/supabase-schema.sql](server/supabase-schema.sql), verify `/api/orders` returns JSON, and confirm `VITE_API_BASE_URL` is correct.

- Reports failing to load/create:
Check `/api/health`, then verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

- Works locally but not across devices:
Use deployed Vercel URL for all roles; localStorage does not share state between devices.

## Security Note

Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code. If compromised, rotate it immediately in Supabase and update Vercel.

---

Built for rapid-response traffic intelligence at hackathon speed.
