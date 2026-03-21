import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const reportsTable = 'user_reports';

let cachedClient = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cachedClient;
};

export const mapRowToReport = (row) => ({
  id: row.id,
  name: row.name,
  phoneNumber: row.phone_number,
  location: row.location,
  accidentPoint: row.accident_point,
  accidentType: row.accident_type,
  confirmedSeverity: row.confirmed_severity,
  confirmedAccidentType: row.confirmed_accident_type,
  enrichmentDetails: row.enrichment_details || null,
  description: row.description,
  imageDataUrl: row.image_data_url,
  createdAt: row.created_at,
  status: row.status,
  lat: row.lat,
  lng: row.lng,
});

export const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
};

export const createId = () => `REP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;