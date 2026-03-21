import {
  createId,
  getSupabaseClient,
  isSupabaseConfigured,
  mapRowToReport,
  parseJsonBody,
  reportsTable,
} from '../_lib/supabase.js';

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
      .select('id, name, phone_number, location, accident_type, description, image_data_url, created_at, status, lat, lng')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load reports' });
      return;
    }

    res.status(200).json((data || []).map(mapRowToReport));
  } catch {
    res.status(500).json({ error: 'Unexpected error while loading reports' });
  }
};

const createReport = async (req, res) => {
  try {
    const body = await parseJsonBody(req);
    const { name, phoneNumber, location, accidentType, description, imageDataUrl } = body || {};

    if (!name || !phoneNumber || !location || !accidentType || !description || !imageDataUrl) {
      res.status(400).json({ error: 'Missing required report fields' });
      return;
    }

    const createdAt = new Date().toISOString();
    const report = {
      id: createId(),
      name,
      phoneNumber,
      location,
      accidentType,
      description,
      imageDataUrl,
      createdAt,
      status: 'REPORTED',
      lat: 23.215 + (Math.random() - 0.5) * 0.02,
      lng: 72.637 + (Math.random() - 0.5) * 0.02,
    };

    const supabase = getSupabaseClient();
    const { error } = await supabase.from(reportsTable).insert({
      id: report.id,
      name: report.name,
      phone_number: report.phoneNumber,
      location: report.location,
      accident_type: report.accidentType,
      description: report.description,
      image_data_url: report.imageDataUrl,
      created_at: report.createdAt,
      status: report.status,
      lat: report.lat,
      lng: report.lng,
    });

    if (error) {
      res.status(500).json({ error: 'Failed to create report' });
      return;
    }

    res.status(201).json(report);
  } catch {
    res.status(500).json({ error: 'Unexpected error while creating report' });
  }
};