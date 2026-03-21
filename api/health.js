import { isSupabaseConfigured } from './_lib/supabase.js';

export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    runtime: 'vercel-function',
    database: 'supabase-postgresql',
    configured: isSupabaseConfigured,
  });
}