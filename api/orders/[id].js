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

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const id = req.query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Order id is required' });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const status = body?.status;

    if (status !== 'ACKNOWLEDGED' && status !== 'CANCELLED') {
      res.status(400).json({ error: 'Only ACKNOWLEDGED or CANCELLED status updates are supported' });
      return;
    }

    const updatePayload = { status };

    if (status === 'ACKNOWLEDGED') {
      const acknowledgedBy = body?.acknowledgedBy;
      const acknowledgedAt = body?.acknowledgedAt;
      if (!acknowledgedBy || !acknowledgedAt) {
        res.status(400).json({ error: 'Missing acknowledgedBy or acknowledgedAt for ACKNOWLEDGED status' });
        return;
      }

      updatePayload.acknowledged_by = acknowledgedBy;
      updatePayload.acknowledged_at = acknowledgedAt;
      updatePayload.cancellation_reason = null;
    }

    if (status === 'CANCELLED') {
      const cancellationReason = body?.cancellationReason;
      if (!cancellationReason) {
        res.status(400).json({ error: 'Missing cancellationReason for CANCELLED status' });
        return;
      }

      updatePayload.cancellation_reason = cancellationReason;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(ordersTable)
      .update(updatePayload)
      .eq('id', id)
      .select('id, timestamp, decision_type, incident_id, summary, operator, status, acknowledged_by, acknowledged_at, cancellation_reason')
      .single();

    if (error) {
      res.status(500).json(formatDbError(error, 'Failed to update command order status'));
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Command order not found' });
      return;
    }

    res.status(200).json(mapRowToOrder(data));
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error while updating command order',
      details: error instanceof Error ? error.message : null,
    });
  }
}
