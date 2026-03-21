import express from 'express';
import { initDatabase, isSupabaseConfigured, reportsTable, supabase } from './db.js';

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(express.json({ limit: '20mb' }));

const createId = () => `REP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const parseAccidentPointCoords = (accidentPoint) => {
  if (typeof accidentPoint !== 'string') return null;
  const match = accidentPoint.match(/Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const mapRowToReport = (row) => ({
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: 'supabase-postgresql', configured: isSupabaseConfigured });
});

app.get('/api/reports', async (_req, res) => {
  const { data, error } = await supabase
    .from(reportsTable)
    .select('id, name, phone_number, location, accident_point, accident_type, confirmed_severity, confirmed_accident_type, enrichment_details, description, image_data_url, created_at, status, lat, lng')
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to load reports' });
    return;
  }

  res.json((data || []).map(mapRowToReport));
});

app.post('/api/reports', async (req, res) => {
  const { name, phoneNumber, location, accidentPoint, accidentType, description, imageDataUrl } = req.body || {};

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
    res.status(500).json({ error: 'Failed to create report' });
    return;
  }

  res.status(201).json(report);
});

app.patch('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  const status = req.body?.status;
  const confirmedSeverity = req.body?.confirmedSeverity;
  const confirmedAccidentType = req.body?.confirmedAccidentType;
  const enrichmentDetails = req.body?.enrichmentDetails;

  if (status !== 'ACTIVE' && status !== 'RESOLVED') {
    res.status(400).json({ error: 'Only ACTIVE or RESOLVED status updates are supported' });
    return;
  }

  const updatePayload = { status };

  if (status === 'ACTIVE') {
    if (!confirmedSeverity || !confirmedAccidentType || !enrichmentDetails || typeof enrichmentDetails !== 'object') {
      res.status(400).json({ error: 'Missing enrichment payload' });
      return;
    }

    updatePayload.confirmed_severity = confirmedSeverity;
    updatePayload.confirmed_accident_type = confirmedAccidentType;
    updatePayload.enrichment_details = enrichmentDetails;
  }

  const { data, error } = await supabase
    .from(reportsTable)
    .update(updatePayload)
    .eq('id', id)
    .select('id, name, phone_number, location, accident_point, accident_type, confirmed_severity, confirmed_accident_type, enrichment_details, description, image_data_url, created_at, status, lat, lng')
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to update report status' });
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.status(200).json(mapRowToReport(data));
});

app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from(reportsTable).delete().eq('id', id).select('id');

  if (error) {
    res.status(500).json({ error: 'Failed to delete report' });
    return;
  }

  if (!data || data.length === 0) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.status(204).send();
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Aetrix API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
