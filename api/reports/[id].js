import { getSupabaseClient, isSupabaseConfigured, reportsTable } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!isSupabaseConfigured) {
    res.status(500).json({ error: 'Backend is not configured. Missing Supabase environment variables.' });
    return;
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
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
    res.status(500).json({ error: 'Unexpected error while deleting report' });
  }
}