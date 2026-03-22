import {
  getSupabaseClient,
  isSupabaseConfigured,
  mapRowToOrder,
  ordersTable,
  parseJsonBody,
} from '../_lib/supabase.js';

const formatDbError = (error, fallback) => {
  if (!error || typeof error !== 'object') return { error: fallback };

  return {
    error: typeof error.message === 'string' && error.message.trim() ? error.message.trim() : fallback,
    code: typeof error.code === 'string' && error.code.trim() ? error.code.trim() : null,
    details: typeof error.details === 'string' && error.details.trim() ? error.details.trim() : null,
    hint: typeof error.hint === 'string' && error.hint.trim() ? error.hint.trim() : null,
  };
};

export default async function handler(req, res) {
  if (!isSupabaseConfigured) {
    res.status(500).json({ error: 'Backend is not configured. Missing Supabase environment variables.' });
    return;
  }

  if (req.method === 'GET') {
    await listOrders(res);
    return;
  }

  if (req.method === 'POST') {
    await createOrder(req, res);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

const listOrders = async (res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(ordersTable)
      .select('id, timestamp, decision_type, incident_id, summary, operator, status, acknowledged_by, acknowledged_at, cancellation_reason')
      .order('timestamp', { ascending: false });

    if (error) {
      res.status(500).json(formatDbError(error, 'Failed to load command orders'));
      return;
    }

    res.status(200).json((data || []).map(mapRowToOrder));
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error while loading command orders',
      details: error instanceof Error ? error.message : null,
    });
  }
};

const createOrder = async (req, res) => {
  try {
    const body = await parseJsonBody(req);
    const { id, timestamp, decisionType, incidentId, summary, operator, status, acknowledgedBy, acknowledgedAt, cancellationReason } = body || {};

    if (!id || !timestamp || !decisionType || !incidentId || !summary || !operator || !status) {
      res.status(400).json({ error: 'Missing required order fields' });
      return;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(ordersTable)
      .upsert({
        id,
        timestamp,
        decision_type: decisionType,
        incident_id: incidentId,
        summary,
        operator,
        status,
        acknowledged_by: acknowledgedBy || null,
        acknowledged_at: acknowledgedAt || null,
        cancellation_reason: cancellationReason || null,
      }, { onConflict: 'id' })
      .select('id, timestamp, decision_type, incident_id, summary, operator, status, acknowledged_by, acknowledged_at, cancellation_reason')
      .single();

    if (error) {
      res.status(500).json(formatDbError(error, 'Failed to create command order'));
      return;
    }

    res.status(201).json(mapRowToOrder(data));
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error while creating command order',
      details: error instanceof Error ? error.message : null,
    });
  }
};
