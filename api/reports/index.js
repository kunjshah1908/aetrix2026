import {
  createId,
  getSupabaseClient,
  isSupabaseConfigured,
  mapRowToReport,
  parseJsonBody,
  reportsTable,
} from '../_lib/supabase.js';

const formatDbError = (error, fallback) => {
  if (!error || typeof error !== 'object') return fallback;
  const message = typeof error.message === 'string' && error.message.trim() ? error.message.trim() : fallback;
  const code = typeof error.code === 'string' && error.code.trim() ? error.code.trim() : null;
  const details = typeof error.details === 'string' && error.details.trim() ? error.details.trim() : null;
  const hint = typeof error.hint === 'string' && error.hint.trim() ? error.hint.trim() : null;

  return {
    error: message,
    code,
    details,
    hint,
  };
};

const parseAccidentPointCoords = (accidentPoint) => {
  if (typeof accidentPoint !== 'string') return null;
  const match = accidentPoint.match(/Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

export default async function handler(req, res) {
  if (!isSupabaseConfigured) {
    res.status(500).json({ error: 'Backend is not configured. Missing Supabase environment variables.' });
    return;
  }

  if (req.method === 'GET') {
    await getReports(res);
    return;
  }

  if (req.method === 'POST') {
    await createReport(req, res);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

const getReports = async (res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(reportsTable)
      .select('id, name, phone_number, location, accident_point, accident_type, confirmed_severity, confirmed_accident_type, enrichment_details, description, image_data_url, created_at, status, lat, lng')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json(formatDbError(error, 'Failed to load reports'));
      return;
    }

    res.status(200).json((data || []).map(mapRowToReport));
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error while loading reports',
      details: error instanceof Error ? error.message : null,
    });
  }
};

const createReport = async (req, res) => {
  try {
    const body = await parseJsonBody(req);
    const { name, phoneNumber, location, accidentPoint, accidentType, description, imageDataUrl } = body || {};

    if (!name || !phoneNumber || !location || !accidentPoint || !accidentType || !description || !imageDataUrl) {
      res.status(400).json({ error: 'Missing required report fields' });
      return;
    }

    const createdAt = new Date().toISOString();
    const coords = parseAccidentPointCoords(accidentPoint);
    const report = {
      id: createId(),
      name,
      phoneNumber,
      location,
      accidentPoint,
      accidentType,
      confirmedSeverity: null,
      confirmedAccidentType: null,
      enrichmentDetails: null,
      description,
      imageDataUrl,
      createdAt,
      status: 'REPORTED',
      lat: coords?.lat ?? 23.215 + (Math.random() - 0.5) * 0.02,
      lng: coords?.lng ?? 72.637 + (Math.random() - 0.5) * 0.02,
    };

    const supabase = getSupabaseClient();
    const { error } = await supabase.from(reportsTable).insert({
      id: report.id,
      name: report.name,
      phone_number: report.phoneNumber,
      location: report.location,
      accident_point: report.accidentPoint,
      accident_type: report.accidentType,
      confirmed_severity: report.confirmedSeverity,
      confirmed_accident_type: report.confirmedAccidentType,
      enrichment_details: report.enrichmentDetails,
      description: report.description,
      image_data_url: report.imageDataUrl,
      created_at: report.createdAt,
      status: report.status,
      lat: report.lat,
      lng: report.lng,
    });

    if (error) {
      res.status(500).json(formatDbError(error, 'Failed to create report'));
      return;
    }

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error while creating report',
      details: error instanceof Error ? error.message : null,
    });
  }
};