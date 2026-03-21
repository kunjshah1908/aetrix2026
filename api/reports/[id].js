import {
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

  if (req.method !== 'DELETE' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'DELETE, PATCH');
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const id = req.query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Report id is required' });
    return;
  }

  try {
    const supabase = getSupabaseClient();

    if (req.method === 'PATCH') {
      const body = await parseJsonBody(req);
      const status = body?.status;
      const confirmedSeverity = body?.confirmedSeverity;
      const confirmedAccidentType = body?.confirmedAccidentType;
      const enrichmentDetails = body?.enrichmentDetails;

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
      return;
    }

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
  } catch {
    res.status(500).json({ error: 'Unexpected error while updating/deleting report' });
  }
}