import { useState, useEffect } from 'react';
import { getPendingOrders, acknowledgeOrder, cancelOrder, type CommandOrder } from '../lib/ordersStore';

interface Props {
  officerBadge: string;
}

export default function OrdersPanel({ officerBadge }: Props) {
  const [orders, setOrders] = useState<CommandOrder[]>(getPendingOrders());
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(getPendingOrders());
  }, []);

  const handleAcknowledge = (orderId: string) => {
    const updated = acknowledgeOrder(orderId, officerBadge);
    setOrders(updated.filter(o => o.status === 'PENDING'));
  };

  const handleCancelClick = (orderId: string) => {
    setCancellingId(orderId);
  };

  const handleConfirmCancel = (orderId: string) => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    const updated = cancelOrder(orderId, cancelReason);
    setOrders(updated.filter(o => o.status === 'PENDING'));
    setCancellingId(null);
    setCancelReason('');
  };

  return (
    <div className="orders-panel">
      <div className="section-header">COMMAND CENTER ORDERS ({orders.length})</div>
      {orders.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
          No pending orders.
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-item">
              <div className="order-header">
                <span className={`order-type ${order.decisionType.toLowerCase().replace(/\s+/g, '-')}`}>
                  {order.decisionType}
                </span>
                <span className="order-incident-id">{order.incidentId}</span>
              </div>
              <div className="order-summary">{order.summary}</div>
              <div className="order-meta">
                <div className="order-timestamp">{order.timestamp}</div>
                <div className="order-operator">By: {order.operator}</div>
              </div>

              {cancellingId === order.id ? (
                <div className="cancel-reason-form">
                  <input
                    type="text"
                    className="cancel-input"
                    placeholder="Reason for cancellation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="cancel-buttons">
                    <button
                      className="cancel-confirm"
                      onClick={() => handleConfirmCancel(order.id)}
                    >
                      Confirm Cancel
                    </button>
                    <button
                      className="cancel-close"
                      onClick={() => {
                        setCancellingId(null);
                        setCancelReason('');
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="order-actions">
                  <button className="order-btn okay" onClick={() => handleAcknowledge(order.id)}>
                    OKAY
                  </button>
                  <button className="order-btn cancel" onClick={() => handleCancelClick(order.id)}>
                    CANCEL
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}