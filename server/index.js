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
    .select('id, name, phone_number, location, accident_point, accident_type, description, image_data_url, created_at, status, lat, lng')
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
